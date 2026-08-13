import { BotMessageSquare, MessageCircle, Moon, Settings, Sun } from "lucide-solid";
import { type Component, createSignal } from "solid-js";

import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

import MainLayout, { type NavItem } from "@/layouts/MainLayout/MainLayout";
import ChatPage from "@/pages/ChatPage/ChatPage";
import SettingsPage from "@/pages/SettingsPage/SettingsPage";
import ThemePage from "@/pages/ThemePage/ThemePage";
import AppBanner from "@/components/AppBanner/AppBanner";
import Modal from "@/components/Modal/Modal";

const AppContent: Component = () => {
	const [activeNav, setActiveNav] = createSignal("chat");
	const [settingsOpen, setSettingsOpen] = createSignal(false);
	const { t } = useLocale();
	const { isDark, toggleDark } = useTheme();

	const topNav: NavItem[] = [{ id: "chat", icon: <MessageCircle />, label: t("nav.chat") }];

	const bottomNav: NavItem[] = [
		{
			id: "settings",
			icon: <Settings />,
			label: t("nav.settings"),
		},
		{
			id: "themeMode",
			icon: <Sun class="w-5 h-5" />,
			altIcon: <Moon class="w-5 h-5" />,
			label: t("theme.switchToLight"),
			isSwitch: true,
		},
	];

	const onNavSelect = (item: NavItem) => {
		if (item.isSwitch) {
			if (item.id === "themeMode") toggleDark();
		} else if (item.id === "settings") {
			setSettingsOpen(true);
		} else {
			setActiveNav(item.id);
		}
	};

	return (
		<div class="app">
			<MainLayout
				topNavItems={topNav}
				bottomNavItems={bottomNav}
				isDark={isDark()}
				activeNav={activeNav()}
				onNavSelect={onNavSelect}
				navTop={<BotMessageSquare class="w-10 h-10 text-primary" />}
			>
				{activeNav() === "chat" && <ChatPage sidebarHeader={<AppBanner />} sidebarBottom={<div class="h-12" />} />}
			</MainLayout>

			<Modal open={settingsOpen()} onClose={() => setSettingsOpen(false)} title={t("settings.title")} minWidth="66rem">
				<SettingsPage />
				<div class="divider" />
				<ThemePage />
			</Modal>
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
