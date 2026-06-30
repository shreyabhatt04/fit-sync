function StatCard({
    title,
    value,
    subtitle,
    icon,
    color = 'default',
    trend,
    trendUp,
}) {
    // Monochrome-first palette — color only used for status icons
    const colorMap = {
        default: { iconBg: '#f2f2f2', iconColor: '#2b2b2b', iconBorder: '#d8d8d8' },
        blue:    { iconBg: '#f2f2f2', iconColor: '#2b2b2b', iconBorder: '#d8d8d8' },
        green:   { iconBg: '#f0faf4', iconColor: '#166035', iconBorder: '#bbf7d0' },
        orange:  { iconBg: '#fef3e8', iconColor: '#a04a0c', iconBorder: '#fed7aa' },
        red:     { iconBg: '#fff0ef', iconColor: '#a01f18', iconBorder: '#fecaca' },
        purple:  { iconBg: '#f3f0fb', iconColor: '#4a2f99', iconBorder: '#ddd6fe' },
        yellow:  { iconBg: '#fdf8ee', iconColor: '#7a500a', iconBorder: '#fde68a' },
        teal:    { iconBg: '#eef9f7', iconColor: '#0d6b62', iconBorder: '#99f6e4' },
    }

    const c = colorMap[color] || colorMap.default

    return (
        <div className="stat-card">
            <div className="stat-card-top">
                <div>
                    <p className="stat-card-title">{title}</p>
                    <p className="stat-card-value">{value}</p>
                    {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
                </div>
                <div
                    className="stat-card-icon"
                    style={{
                        background: c.iconBg,
                        color: c.iconColor,
                        border: `1px solid ${c.iconBorder}`,
                    }}
                >
                    {icon}
                </div>
            </div>

            {trend !== undefined && (
                <div className={`stat-card-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
                    {trendUp ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="18 15 12 9 6 15" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    )}
                    <span>{trend} from last month</span>
                </div>
            )}
        </div>
    )
}

export default StatCard
