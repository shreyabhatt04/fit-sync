// PageLoader.jsx
//
// Reusable loading indicators used throughout the app.
// Zero props needed for the common case — just drop <PageLoader /> in.
//
// Three exports:
//
//   <PageLoader />           — Centered large spinner with optional message.
//   <RowLoader />            — Small centered spinner for inside table rows.
//   <Skeleton />             — Shimmer placeholder box (width/height props).
//
// All styling lives in global.css (.page-loader, .row-loader, .skeleton).

export function PageLoader({ message = 'Loading...' }) {
    return (
        <div className="page-loader">
            <div className="spinner spinner-xl" />
            {message ? <p>{message}</p> : null}
        </div>
    )
}

export function RowLoader({ colSpan = 1, message = null }) {
    return (
        <tr>
            <td colSpan={colSpan}>
                <div className="row-loader">
                    <div className="spinner" />
                    {message ? <p>{message}</p> : null}
                </div>
            </td>
        </tr>
    )
}

export function Skeleton({ width, height = 14, circle = false, style = {}, className = '' }) {
    const cls = [
        'skeleton',
        circle ? 'skeleton-circle' : '',
        className,
    ].filter(Boolean).join(' ')

    return (
        <span
            className={cls}
            style={{
                width: width || '100%',
                height,
                ...style,
            }}
        />
    )
}

// Default export = the most-common one, so pages can do `import PageLoader from ...`
export default PageLoader
