/**
 * Split-screen authentication shell.
 * Left: brand story panel (hidden on small screens).
 * Right: the actual form, passed in as children.
 */
function AuthLayout({ eyebrow, headline, subheadline, trustItems, children }) {
    return (
        <div className="auth-page">
            <div className="auth-shell">

                <aside className="auth-brand" aria-hidden="true">

                    <div className="auth-brand-roadlines">
                        <span className="roadline roadline-1" />
                        <span className="roadline roadline-2" />
                        <span className="roadline roadline-3" />
                    </div>

                    <div className="auth-brand-content">

                        <div className="auth-brand-mark">
                            <span className="auth-brand-mark-icon">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 13.5 5.4 7a2 2 0 0 1 1.9-1.3h9.4A2 2 0 0 1 18.6 7l2.4 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                    <rect x="2.2" y="13.2" width="19.6" height="5.6" rx="1.6" stroke="currentColor" strokeWidth="1.6"/>
                                    <circle cx="7" cy="18.8" r="1.6" fill="currentColor"/>
                                    <circle cx="17" cy="18.8" r="1.6" fill="currentColor"/>
                                </svg>
                            </span>
                            <span className="auth-brand-name">RoadAid</span>
                        </div>

                        {eyebrow && <p className="auth-brand-eyebrow">{eyebrow}</p>}

                        <h1 className="auth-brand-headline">{headline}</h1>
                        <p className="auth-brand-subheadline">{subheadline}</p>

                        {trustItems && (
                            <ul className="auth-brand-trust">
                                {trustItems.map((item) => (
                                    <li key={item.label}>
                                        <span className="auth-brand-trust-icon">{item.icon}</span>
                                        {item.label}
                                    </li>
                                ))}
                            </ul>
                        )}

                    </div>

                    <p className="auth-brand-footer">
                        Roadside Assistance Platform
                    </p>

                </aside>

                <main className="auth-panel">
                    <div className="auth-panel-inner">
                        {children}
                    </div>
                </main>

            </div>
        </div>
    );
}

export default AuthLayout;