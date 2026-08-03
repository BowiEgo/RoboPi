import { MessageCircle, Moon, Palette, Settings, Sun } from "lucide-solid";
import { type Component, createMemo, createSignal } from "solid-js";

import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

import MainLayout, { type NavItem } from "@/layouts/MainLayout/MainLayout";
import ChatPage from "@/pages/ChatPage/ChatPage";
import SettingsPage from "@/pages/SettingsPage/SettingsPage";
import ThemePage from "@/pages/ThemePage/ThemePage";
import AppBanner from "@/components/AppBanner/AppBanner";

import electronLogo from "@/assets/icons/electron.svg";

const AppContent: Component = () => {
	const [activeNav, setActiveNav] = createSignal("chat");
	const { t } = useLocale();
	const { isDark, toggleDark } = useTheme();

	const topNav: NavItem[] = [
		{ id: "chat", icon: <MessageCircle />, label: t("nav.chat") },
		{
			id: "theme",
			icon: <Palette />,
			label: t("nav.theme"),
		},
	];

	const bottomNav = createMemo<NavItem[]>(() => [
		{
			id: "settings",
			icon: <Settings />,
			label: t("nav.settings"),
		},
		{
			id: "themeMode",
			icon: isDark() ? <Sun /> : <Moon />,
			label: isDark() ? t("theme.switchToLight") : t("theme.switchToDark"),
			isSwitch: true,
		},
	]);

	const onNavSelect = (item: NavItem) => {
		if (item.isSwitch) {
			if (item.id === "themeMode") toggleDark();
		} else {
			setActiveNav(item.id);
		}
	};

	return (
		<div class="app">
			<MainLayout
				topNavItems={topNav}
				bottomNavItems={bottomNav()}
				activeNav={activeNav()}
				onNavSelect={onNavSelect}
				navTop={<img alt="logo" src={electronLogo} class="h-5 w-5" />}
			>
				{activeNav() === "chat" && (
					<ChatPage
						sidebarHeader={<AppBanner />}
						sidebarBottom={<div class="h-12" />}
					/>
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
