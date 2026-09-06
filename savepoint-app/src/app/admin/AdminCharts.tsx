'use client';

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

export function TrafficChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No traffic data available yet.</div>;
  }

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickMargin={10} />
          <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(val) => val.toLocaleString()} />
          <RechartsTooltip 
            contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-surface-border)', borderRadius: '8px' }}
            itemStyle={{ color: 'var(--accent-primary)' }}
          />
          <Line type="monotone" dataKey="views" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-background)' }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SignupsChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No signup data available yet.</div>;
  }

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickMargin={10} />
          <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
          <RechartsTooltip 
            contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-surface-border)', borderRadius: '8px' }}
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          />
          <Bar dataKey="users" fill="#8884d8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
