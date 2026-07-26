import { type Component, createSignal } from "solid-js";
import electronLogo from "./assets/electron.svg";
import chatIcon from "./assets/chat.svg?raw";
import paletteIcon from "./assets/palette.svg?raw";
import settingsIcon from "./assets/settings.svg?raw";
import { ThemeProvider } from "./contexts/ThemeContext";
import MainLayout, { type NavItem } from "./layouts/MainLayout/MainLayout";
import ChatPage from "./pages/ChatPage/ChatPage";
import ThemePage from "./pages/ThemePage/ThemePage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import Icon from "./components/Icon";

const TOP_NAV: NavItem[] = [
	{ id: "chat", icon: <Icon raw={chatIcon} />, label: "Chat" },
	{ id: "theme", icon: <Icon raw={paletteIcon} />, label: "Theme" },
];

const BOTTOM_NAV: NavItem[] = [
	{ id: "settings", icon: <Icon raw={settingsIcon} />, label: "Settings" },
];

const App: Component = () => {
	const [activeNav, setActiveNav] = createSignal("chat");

	return (
		<ThemeProvider>
			<div class="app">
				<MainLayout
					topNavItems={TOP_NAV}
					bottomNavItems={BOTTOM_NAV}
					activeNav={activeNav()}
					onNavSelect={setActiveNav}
					navTop={<img alt="logo" src={electronLogo} class="h-5 w-5" />}
				>
					{activeNav() === "chat" && (
						<ChatPage
							sidebarHeader={<span>Chat</span>}
							sidebarContent={<div />}
							sidebarBottom={<div class="h-12" />}
							chatHeader={<span>对话</span>}
							chatInput={<div class="h-12" />}
						>
							<div>对话消息区域</div>
						</ChatPage>
					)}
					{activeNav() === "theme" && <ThemePage />}
					{activeNav() === "settings" && <SettingsPage />}
				</MainLayout>
			</div>
		</ThemeProvider>
	);
};

export default App;
