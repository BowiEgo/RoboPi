import { For } from "solid-js";

import type { NavItem } from "./MainLayout";

interface NavMenuListProps {
	items: NavItem[];
	activeNav: string;
	expanded: boolean;
	onSelect: (item: NavItem) => void;
}

export default function NavMenuList(props: NavMenuListProps) {
	return (
		<ul class={`menu ${props.expanded ? "w-full" : "w-full items-center"}`}>
			<For each={props.items}>
				{(item) => (
					<li
						class={`rounded-box mb-3 transition-colors ${props.activeNav === item.id ? "bg-primary text-primary-content" : "hover:bg-primary/20 active:bg-primary/30 focus-visible:bg-primary/20"}`}
					>
						{props.expanded ? (
							<button
								type="button"
								class="flex items-center gap-3 w-full px-3 py-2 rounded-box bg-transparent outline-none active:bg-transparent focus-visible:bg-transparent"
								aria-label={item.label}
								onClick={() => props.onSelect(item)}
							>
								<span class="flex items-center justify-center w-5 h-5 shrink-0">
									{item.icon}
								</span>
								<span class="text-sm font-medium truncate">{item.label}</span>
							</button>
						) : (
							<button
								type="button"
								class="tooltip tooltip-right flex items-center justify-center w-10 h-10 rounded-box bg-transparent outline-none active:bg-transparent focus-visible:bg-transparent"
								data-tip={item.label}
								aria-label={item.label}
								onClick={() => props.onSelect(item)}
							>
								<span class="flex items-center justify-center w-5 h-5">
									{item.icon}
								</span>
							</button>
						)}
					</li>
				)}
			</For>
		</ul>
	);
}
