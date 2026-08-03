import { ChevronLeft, ChevronRight } from "lucide-solid";
import { type Component, createSignal, type JSX } from "solid-js";

import { useLocale } from "@/contexts/LocaleContext";

import TitleBar from "@/components/TitleBar/TitleBar";

import NavMenuList from "./NavMenuList";

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

const MainLayout: Component<MainLayoutProps> = (props) => {
	const { t } = useLocale();
	const [expanded, setExpanded] = createSignal(false);

	return (
		<div class="flex flex-col w-screen h-screen overflow-hidden">
			<TitleBar />
			<div class="flex flex-1 overflow-hidden">
				<nav
					class={`flex flex-col items-center w-20 h-full shrink-0 pt-6 border-r border-base-300 bg-base-300 py-3 px-1 select-none gap-1 transition-[width] ${expanded() ? "w-52" : "w-14.5"}`}
					aria-label={t("nav.pageNav")}
				>
					{props.navTop && (
						<div class="flex items-center justify-center w-18 h-8 shrink-0 mb-4.5">
							{props.navTop}
						</div>
					)}

					<NavMenuList
						items={props.topNavItems}
						activeNav={props.activeNav}
						expanded={expanded()}
						onSelect={props.onNavSelect}
					/>

					{props.bottomNavItems.length > 0 && (
						<div class="mt-auto flex flex-col items-center w-full">
							<div class="w-6 h-px bg-base-300 my-1 opacity-50" />
							<NavMenuList
								items={props.bottomNavItems}
								activeNav={props.activeNav}
								expanded={expanded()}
								onSelect={props.onNavSelect}
							/>
						</div>
					)}

					{/* Expand / collapse toggle */}
					<button
						type="button"
						class="flex items-center justify-center w-full py-2 mt-2 rounded-box hover:bg-primary/20 transition-colors"
						aria-label={expanded() ? "Collapse sidebar" : "Expand sidebar"}
						onClick={() => setExpanded((v) => !v)}
					>
						{expanded() ? (
							<ChevronLeft class="w-4 h-4" />
						) : (
							<ChevronRight class="w-4 h-4" />
						)}
					</button>
				</nav>

				<main
					class="flex-1 flex flex-col overflow-hidden bg-base-100 text-base-content"
					aria-label={t("nav.pageContent")}
				>
					{props.children}
				</main>
			</div>
		</div>
	);
};

export default MainLayout;
