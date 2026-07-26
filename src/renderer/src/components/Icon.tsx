import type { Component } from "solid-js";

interface IconProps {
	raw: string;
}

/**
 * Renders an inline SVG from a raw SVG string.
 * Uses `innerHTML` so `currentColor` inherits from the parent element.
 */
const Icon: Component<IconProps> = (props) => {
	return <span innerHTML={props.raw} />;
};

export default Icon;
