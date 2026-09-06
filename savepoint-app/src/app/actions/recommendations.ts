'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { fetchIGDB, getIGDBImageUrl } from '@/lib/igdb';
import { GoogleGenAI, Type, Schema } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getGeminiRecommendations() {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    // 1. Fetch user's liked games
    const likedGames = await prisma.userGame.findMany({
      where: {
        userId: session.user.id,
        rating: { gte: 4 }, // Liked (4 or 5 stars)
      },
      include: { game: true },
      take: 10,
    });

    if (likedGames.length === 0) return [];

    const likedTitles = likedGames.map(ug => ug.game.name);

    // 2. Ask Gemini to recommend 10 similar games
    const responseSchema: Schema = {
      type: Type.ARRAY,
      description: "List of exactly 10 video game titles",
      items: {
        type: Type.STRING,
      },
    };

    const prompt = `
      The user likes the following video games:
      ${likedTitles.join('\n')}

      Based on these games, recommend exactly 10 highly similar video games that they would absolutely love. 
      Do NOT recommend any games that are already in the user's liked list.
      Provide ONLY the exact titles of the games.
    `;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const text = result.text;
    if (!text) return [];

    const recommendedTitles: string[] = JSON.parse(text);

    // 3. Fetch details from IGDB for these 10 titles in parallel
    const igdbPromises = recommendedTitles.map(async (title) => {
      const igdbQuery = `
        search "${title.replace(/"/g, '')}";
        fields name, slug, cover.image_id, genres.name, total_rating;
        limit 1;
      `;
      const res = await fetchIGDB('games', igdbQuery);
      return res.length > 0 ? res[0] : null;
    });

    const igdbResults = await Promise.all(igdbPromises);
    const validGames = igdbResults.filter(Boolean);

    // 4. Map to our format
    return validGames.map((game: any) => ({
      id: game.id.toString(),
      name: game.name,
      slug: game.slug,
      coverUrl: getIGDBImageUrl(game.cover?.image_id, 'cover_big'),
      genres: game.genres?.map((g: any) => g.name) || [],
      rating: game.total_rating ? (game.total_rating / 100) * 5 : 0,
    }));

  } catch (error) {
    console.error('Failed to generate Gemini recommendations:', error);
    return [];
  }
}
