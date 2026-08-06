import { ChevronLeft, ChevronRight } from "lucide-solid";
import { type Component, createSignal, type JSX } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import TitleBar from "@/components/TitleBar/TitleBar";

import NavMenuList from "./NavMenuList";
import { cx } from "@/utils/cx";

export interface NavItem {
	id: string;
	icon: JSX.Element;
	label: string;
	isSwitch?: boolean;
}

interface MainLayoutProps {
	topNavItems: NavItem[];
	bottomNavItems: NavItem[];
	activeNav: string;
	onNavSelect: (item: NavItem) => void;
	navTop?: JSX.Element;
	children: JSX.Element;
}

const C = {
	root: { display: "flex flex-col", sizing: "w-screen h-screen overflow-hidden" },
	body: { display: "flex", sizing: "flex-1 overflow-hidden" },
	nav: {
		display: "flex flex-col items-center select-none",
		sizing: "shrink-0 w-14.5 transition-[width]",
		spacing: "pt-6 py-3 px-1 gap-1",
		color: "border-r border-base-300 bg-app",
		colorDark: "border-gray-700",
	},
	navExpanded: { sizing: "w-52" },
	navTop: { display: "flex items-center justify-center", sizing: "w-18 h-8 shrink-0", spacing: "mb-4.5" },
	navBottom: { display: "mt-auto flex flex-col items-center", sizing: "w-full" },
	toggle: {
		display: "flex items-center justify-center",
		sizing: "w-full",
		spacing: "py-2 mt-2",
		interaction: "rounded-box transition-colors",
		color: "hover:bg-primary/20",
	},
	main: { display: "flex flex-col", sizing: "flex-1 overflow-hidden", color: "bg-app text-base-content" },
};

const MainLayout: Component<MainLayoutProps> = (props) => {
	const { t } = useLocale();
	const [expanded, setExpanded] = createSignal(false);

	const navClass = () => `${cx(C.nav)} ${expanded() ? cx(C.navExpanded) : ""}`;

	return (
		<div class={cx(C.root)}>
			<TitleBar />
			<div class={cx(C.body)}>
				<nav class={navClass()} aria-label={t("nav.pageNav")}>
					{props.navTop && <div class={cx(C.navTop)}>{props.navTop}</div>}
					<NavMenuList
						items={props.topNavItems}
						activeNav={props.activeNav}
						expanded={expanded()}
						onSelect={props.onNavSelect}
					/>
					{props.bottomNavItems.length > 0 && (
						<div class={cx(C.navBottom)}>
							<NavMenuList
								items={props.bottomNavItems}
								activeNav={props.activeNav}
								expanded={expanded()}
								onSelect={props.onNavSelect}
							/>
						</div>
					)}
					<button
						type="button"
						class={cx(C.toggle)}
						aria-label={expanded() ? "Collapse sidebar" : "Expand sidebar"}
						onClick={() => setExpanded((v) => !v)}
					>
						{expanded() ? <ChevronLeft class="w-4 h-4" /> : <ChevronRight class="w-4 h-4" />}
					</button>
				</nav>
				<main class={cx(C.main)} aria-label={t("nav.pageContent")}>
					{props.children}
				</main>
			</div>
		</div>
	);
};

export default MainLayout;
