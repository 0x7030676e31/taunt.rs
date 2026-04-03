import { Route, Router } from "@solidjs/router";
import { type JSX } from "solid-js";

import Home from "./pages/home";
import Donate from "./pages/donate";
import Adopt from "./pages/adopt";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Donations from "./pages/donations";
import Pet from "./pages/pet";
import Pets from "./pages/pets";
import Application from "./pages/application";
import Applications from "./pages/applications";
import Volunteer from "./pages/volunteer";
import Volunteers from "./pages/volunteers";

import Navbar from "./common/navbar";
import Layout from "./common/layout";

import { AccountContextProvider } from "./providers/account";
import { SocketProviderContext } from "./providers/socket";

const AppLayout = (props: { children?: JSX.Element }) => {
    return (
        <AccountContextProvider>
            <Navbar />
            {props.children}
        </AccountContextProvider>
    )
}

const DashboardLayout = (props: { children?: JSX.Element }) => {
    return (
        <SocketProviderContext>
            <Layout>
                {props.children}
            </Layout>
        </SocketProviderContext>
    )
}

export default function App() {
    return (
        <Router>
            <Route component={AppLayout}>
                <Route path="/" component={Home} />
                <Route path="/donate" component={Donate} />
                <Route path="/adopt" component={Adopt} />
                <Route path="/login" component={Login} />
            </Route>
            <Route path="/dashboard" component={DashboardLayout}>
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