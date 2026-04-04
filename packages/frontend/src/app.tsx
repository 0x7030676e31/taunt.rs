import { Route, Router } from "@solidjs/router";
import { type JSX } from "solid-js";

import Home from "./pages/home";
import Adopt from "./pages/adopt";
import AdoptPet from "./pages/adopt_pet";
import Dashboard from "./pages/dashboard";
import Donations from "./pages/donations";
import DonationSuccess from "./pages/donation_success";
import Pet from "./pages/pet";
import Pets from "./pages/pets";
import CreatePet from "./pages/create_pet";
import Application from "./pages/application";
import Applications from "./pages/applications";

import Navbar from "./common/navbar";
import Layout from "./common/layout";

import { AccountContextProvider } from "./account";
import { I18nProvider } from "./locales/i18n";
import Notifications from "./notifications";

const AppLayout = (props: { children?: JSX.Element }) => {
    return (
        <Navbar>
            {props.children}
        </Navbar>
    )
}

const DashboardLayout = (props: { children?: JSX.Element }) => {
    return (
        <Layout>
            {props.children}
        </Layout>
    )
}

const Root = (props: { children?: JSX.Element }) => {
    return (
        <AccountContextProvider>
            {props.children}
        </AccountContextProvider>
    )
}

export default function App() {
    return (
        <I18nProvider>
            <Notifications />
            <Router root={Root}>
                <Route component={AppLayout}>
                    <Route path="/" component={Home} />
                    <Route path="/adopt" component={Adopt} />
                    <Route path="/adopt/:id" component={AdoptPet} />
                    <Route path="/donations" component={Donations} />
                    <Route path="/donation-success" component={DonationSuccess} />
                </Route>
                <Route path="/dashboard" component={DashboardLayout}>
                    <Route path="/" component={Dashboard} />
                    <Route path="/pets" component={Pets} />
                    <Route path="/pets/:id" component={Pet} />
                    <Route path="/pets/add" component={CreatePet} />
                    <Route path="/applications" component={Applications} />
                    <Route path="/applications/:id" component={Application} />
                </Route>
            </Router>
        </I18nProvider>
    );
}