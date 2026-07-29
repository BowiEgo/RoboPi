import { type Component, createMemo, createSignal } from "solid-js";

import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

import MainLayout, { type NavItem } from "@/layouts/MainLayout/MainLayout";
import ChatPage from "@/pages/ChatPage/ChatPage";
import SettingsPage from "@/pages/SettingsPage/SettingsPage";
import ThemePage from "@/pages/ThemePage/ThemePage";
import AppBanner from "@/components/AppBanner/AppBanner";
import Icon from "@/components/Icon";

import chatIcon from "@/assets/icons/chat.svg?raw";
import electronLogo from "@/assets/icons/electron.svg";
import moonSvg from "@/assets/icons/moon.svg?raw";
import paletteIcon from "@/assets/icons/palette.svg?raw";
import settingsIcon from "@/assets/icons/settings.svg?raw";
import sunSvg from "@/assets/icons/sun.svg?raw";

const AppContent: Component = () => {
	const [activeNav, setActiveNav] = createSignal("chat");
	const { t } = useLocale();

	const { mode, toggleMode } = useTheme();

	const topNav: NavItem[] = [
		{ id: "chat", icon: <Icon raw={chatIcon} />, label: t("nav.chat") },
		{ id: "theme", icon: <Icon raw={paletteIcon} />, label: t("nav.theme") },
	];

	const bottomNav = createMemo<NavItem[]>(() => [
		{
			id: "settings",
			icon: <Icon raw={settingsIcon} />,
			label: t("nav.settings"),
		},
		// 每次 mode() 变化，这里都会重新执行
		/* ── Dark/Light Mode Toggle ── */
		{
			id: "themeMode",
			icon: mode() === "dark" ? <Icon raw={sunSvg} /> : <Icon raw={moonSvg} />,
			label:
				mode() === "dark" ? t("theme.switchToLight") : t("theme.switchToDark"),
			isSwitch: true,
		},
	]);

	const onNavSelect = (item: NavItem) => {
		if (item.isSwitch) {
			if (item.id === "themeMode") toggleMode();
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
						sidebarContent={<div />}
						sidebarBottom={<div class="h-12" />}
						chatHeader={<span>{t("chat.header")}</span>}
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
