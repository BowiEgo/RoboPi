import type { NavItem } from "./MainLayout";
import { define } from "@/utils/cx";

interface NavMenuListProps {
	items: NavItem[];
	activeNav: string;
	expanded: boolean;
	isDark?: boolean;
	onSelect: (item: NavItem) => void;
}

// ── Layout ──

const menu = define({ base: "menu w-full" });
const item = "rounded-box mb-3 transition-colors";
const btn = "rounded-box outline-none";
const btnExpanded = "flex items-center w-full gap-3 px-3 py-2";
const btnCollapsed = "tooltip tooltip-right flex items-center justify-center w-10 h-10";
const icon = "flex items-center justify-center w-5 h-5";
const label = "text-sm font-medium truncate";

export default function NavMenuList(props: NavMenuListProps) {
	return (
		<ul class={`${menu()} ${props.expanded ? "" : "items-center"}`}>
			{props.items.map((navItem) => {
				const active = props.activeNav === navItem.id;

				return (
					<li
						class={`${item} ${active ? "bg-primary text-primary-content" : "hover:bg-primary/20 active:bg-primary/30 focus-visible:bg-primary/20 text-base-content/70"}`}
					>
						{navItem.isSwitch ? (
							// daisyUI swap for theme toggle
							// <div
							// 	class={
							// 		props.expanded
							// 			? "flex items-center gap-3 px-3 py-2 w-full"
							// 			: "tooltip tooltip-right flex items-center justify-center w-10 h-10"
							// 	}
							// 	data-tip={props.expanded ? undefined : navItem.label}
							// >
							<label class="swap swap-rotate">
								<input type="checkbox" checked={props.isDark} onChange={() => props.onSelect(navItem)} />
								<span class="swap-off transition-transform duration-300">{navItem.icon}</span>
								<span class="swap-on transition-transform duration-300">{navItem.altIcon ?? navItem.icon}</span>
							</label>
							// {props.expanded && <span class={label}>{navItem.label}</span>}
							// </div>
						) : props.expanded ? (
							<button
								type="button"
								class={`${btn} ${btnExpanded} bg-transparent active:bg-transparent focus-visible:bg-transparent`}
								aria-label={navItem.label}
								onClick={() => props.onSelect(navItem)}
							>
								<span class={`${icon} shrink-0`}>{navItem.icon}</span>
								<span class={label}>{navItem.label}</span>
							</button>
						) : (
							<button
								type="button"
								class={`${btn} ${btnCollapsed} bg-transparent active:bg-transparent focus-visible:bg-transparent`}
								data-tip={navItem.label}
								aria-label={navItem.label}
								onClick={() => props.onSelect(navItem)}
							>
								<span class={icon}>{navItem.icon}</span>
							</button>
						)}
					</li>
				);
			})}
		</ul>
	);
}
