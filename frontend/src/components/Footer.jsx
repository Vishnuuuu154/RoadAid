// Same token set as AdminSidebar.jsx / Navbar.jsx — keep these in sync.
const COLOR = {
    base: "#0e1218",
    border: "#232a37",
    textFaint: "#5a6376"
};

function Footer() {
    return (
        <footer
            style={{
                background: COLOR.base,
                borderTop: `1px solid ${COLOR.border}`,
                color: COLOR.textFaint,
                textAlign: "center",
                fontSize: "12.5px",
                padding: "16px 20px",
                marginTop: "40px",
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            }}
        >
            © 2026 RoadAid
        </footer>
    );
}

export default Footer;