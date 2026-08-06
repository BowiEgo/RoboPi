import { ChevronLeft, ChevronRight } from "lucide-solid";
import { type Component, createSignal, type JSX } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import TitleBar from "@/components/TitleBar/TitleBar";

import NavMenuList from "./NavMenuList";
import { define } from "@/utils/cx";

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

// ── Layout ──

const root = define({ base: "flex flex-col w-screen h-screen overflow-hidden pt-8 bg-app" });
const body = define({ base: "flex flex-1 overflow-hidden" });
const nav = define({
	base: "flex flex-col items-center select-none shrink-0 w-20 transition-[width] pt-6 py-3 px-1 gap-1",
});
const navTop = "flex items-center justify-center w-18 h-8 shrink-0 mb-4.5";
const navBottom = "mt-auto flex flex-col items-center w-full";
const toggle = "flex items-center justify-center w-full py-2 mt-2 rounded-box transition-colors";
const main = define({ base: "flex flex-col flex-1 overflow-hidden" });

const MainLayout: Component<MainLayoutProps> = (props) => {
	const { t } = useLocale();
	const [expanded, setExpanded] = createSignal(false);

	return (
		<div class={root()}>
			<TitleBar />
			<div class={body()}>
				<nav class={`${nav()} ${expanded() ? "w-52" : ""} bg-app`} aria-label={t("nav.pageNav")}>
					{props.navTop && <div class={navTop}>{props.navTop}</div>}
					<NavMenuList
						items={props.topNavItems}
						activeNav={props.activeNav}
						expanded={expanded()}
						onSelect={props.onNavSelect}
					/>
					{props.bottomNavItems.length > 0 && (
						<div class={navBottom}>
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
						class={`${toggle} hover:bg-primary/20`}
						aria-label={expanded() ? "Collapse sidebar" : "Expand sidebar"}
						onClick={() => setExpanded((v) => !v)}
					>
						{expanded() ? <ChevronLeft class="w-4 h-4" /> : <ChevronRight class="w-4 h-4" />}
					</button>
				</nav>
				<main class={`${main()} bg-app text-base-content`} aria-label={t("nav.pageContent")}>
					{props.children}
				</main>
			</div>
		</div>
	);
};

export default MainLayout;
