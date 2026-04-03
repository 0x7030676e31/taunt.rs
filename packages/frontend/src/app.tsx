import { Route, Router } from "@solidjs/router";
import { type JSX } from "solid-js";

import Home from "./pages/home";
import Donate from "./pages/donate";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Donations from "./pages/donations";
import Pet from "./pages/pet";
import Pets from "./pages/pets";
import Application from "./pages/application";
import Applications from "./pages/applications";
import Volunteer from "./pages/volunteer";
import Volunteers from "./pages/volunteers";

const Layout = (props: { children?: JSX.Element }) => {
    return (
        <>
            {props.children}
        </>
    )
}

export default function App() {
    return (
        <Router>
            <Route path="/" component={Home} />
            <Route path="/donate" component={Donate} />
            <Route path="/login" component={Login} />
            <Route path="/dashboard" component={Layout}>
                <Route path="/" component={Dashboard} />
                <Route path="/donations" component={Donations} />
                <Route path="/pets" component={Pets} />
                <Route path="/pets/:id" component={Pet} />
                <Route path="/applications" component={Applications} />
                <Route path="/applications/:id" component={Application} />
                <Route path="/volunteers" component={Volunteers} />
                <Route path="/volunteers/:id" component={Volunteer} />
            </Route>
        </Router>
    );
}