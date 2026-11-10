import AllUsers from "./AllUsers";

/*
 * The customers page is the All Users page locked to customers.
 * It keeps its own route, tabs (All / Active / Inactive) and search.
 */
function Customers() {
    return <AllUsers role="CUSTOMER" />;
}

export default Customers;