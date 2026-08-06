import { For } from "solid-js";

import type { NavItem } from "./MainLayout";
import { cx } from "@/utils/cx";

interface NavMenuListProps {
	items: NavItem[];
	activeNav: string;
	expanded: boolean;
	onSelect: (item: NavItem) => void;
}

// ── Class constants ──

const C = {
	menu: { display: "menu", sizing: "w-full" },
	menuCollapsed: { display: "items-center" },
	item: {
		interaction: "rounded-box mb-3 transition-colors",
		color: {
			active: "bg-primary text-primary-content",
			idle: "hover:bg-primary/20 active:bg-primary/30 focus-visible:bg-primary/20",
		},
	},
	btn: {
		interaction: "rounded-box outline-none",
		color: "bg-transparent active:bg-transparent focus-visible:bg-transparent",
	},
	btnExpanded: { display: "flex items-center", sizing: "w-full", spacing: "gap-3 px-3 py-2" },
	btnCollapsed: { display: "tooltip tooltip-right flex items-center justify-center", sizing: "w-10 h-10" },
	icon: { display: "flex items-center justify-center", sizing: "w-5 h-5" },
	iconExpanded: { sizing: "shrink-0" },
	label: { text: "text-sm font-medium truncate" },
};

export default function NavMenuList(props: NavMenuListProps) {
	const menuClass = () => `${cx(C.menu)} ${props.expanded ? "" : cx(C.menuCollapsed)}`;
	const itemClass = (id: string) => `${cx(C.item, { active: props.activeNav === id, idle: props.activeNav !== id })}`;

	return (
		<ul class={menuClass()}>
			<For each={props.items}>
				{(item) => (
					<li class={itemClass(item.id)}>
						{props.expanded ? (
							<button
								type="button"
								class={`${cx(C.btn)} ${cx(C.btnExpanded)}`}
								aria-label={item.label}
								onClick={() => props.onSelect(item)}
							>
								<span class={`${cx(C.icon)} ${cx(C.iconExpanded)}`}>{item.icon}</span>
								<span class={cx(C.label)}>{item.label}</span>
							</button>
						) : (
							<button
								type="button"
								class={`${cx(C.btn)} ${cx(C.btnCollapsed)}`}
								data-tip={item.label}
								aria-label={item.label}
								onClick={() => props.onSelect(item)}
							>
								<span class={cx(C.icon)}>{item.icon}</span>
							</button>
						)}
					</li>
				)}
			</For>
		</ul>
	);
}
