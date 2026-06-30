import '../../styles/global.css'

function Table({
    columns,
    data,
    loading = false,
    emptyMessage = 'No records found',
}) {
    if (loading) {
        return (
            <div className="table-loading">
                <div className="spinner" />
                <p>Loading...</p>
            </div>
        )
    }

    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} style={{ width: col.width }}>
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length}>
                                <div className="empty-state" style={{ padding: '32px 0' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                                        <rect x="9" y="3" width="6" height="4" rx="2" />
                                    </svg>
                                    <p>{emptyMessage}</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIdx) => (
                            <tr key={row.id || rowIdx}>
                                {columns.map((col) => (
                                    <td key={col.key}>
                                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}

export default Table