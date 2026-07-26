import { type Component, createSignal } from "solid-js";
import electronLogo from "./assets/electron.svg";
import chatIcon from "./assets/chat.svg?raw";
import paletteIcon from "./assets/palette.svg?raw";
import settingsIcon from "./assets/settings.svg?raw";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocaleProvider, useLocale } from "./contexts/LocaleContext";
import MainLayout, { type NavItem } from "./layouts/MainLayout/MainLayout";
import ChatPage from "./pages/ChatPage/ChatPage";
import ThemePage from "./pages/ThemePage/ThemePage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import Icon from "./components/Icon";

const AppContent: Component = () => {
	const [activeNav, setActiveNav] = createSignal("chat");
	const { t } = useLocale();

	const topNav: NavItem[] = [
		{ id: "chat", icon: <Icon raw={chatIcon} />, label: t("nav.chat") },
		{ id: "theme", icon: <Icon raw={paletteIcon} />, label: t("nav.theme") },
	];
	const bottomNav: NavItem[] = [
		{
			id: "settings",
			icon: <Icon raw={settingsIcon} />,
			label: t("nav.settings"),
		},
	];

	return (
		<div class="app">
			<MainLayout
				topNavItems={topNav}
				bottomNavItems={bottomNav}
				activeNav={activeNav()}
				onNavSelect={setActiveNav}
				navTop={<img alt="logo" src={electronLogo} class="h-5 w-5" />}
			>
				{activeNav() === "chat" && (
					<ChatPage
						sidebarHeader={<span>{t("chat.header")}</span>}
						sidebarContent={<div />}
						sidebarBottom={<div class="h-12" />}
						chatHeader={<span>{t("chat.header")}</span>}
						chatInput={<div class="h-12" />}
					>
						<div>{t("chat.messages")}</div>
					</ChatPage>
				)}
				{activeNav() === "theme" && <ThemePage />}
				{activeNav() === "settings" && <SettingsPage />}
			</MainLayout>
		</div>
	);
};

const App: Component = () => {
	return (
		<ThemeProvider>
			<LocaleProvider>
				<AppContent />
			</LocaleProvider>
		</ThemeProvider>
	);
};

export default App;
