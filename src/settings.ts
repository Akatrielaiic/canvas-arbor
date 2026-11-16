import { App, Plugin, PluginSettingTab, Setting, SettingDefinition, SettingDefinitionItem } from "obsidian";
import { t } from "./i18n";

/**
 * A collapsed branch: the nodes it hides, and where one of them (the anchor) sits from the collapsed
 * node, so the hidden nodes can follow it when it moves.
 */
export interface Fold { ids: string[]; anchor: string; dx: number; dy: number }

export interface Settings {
	autoLayout: boolean;
	enterInEdit: boolean;
	tabAddsChild: boolean;
	mobileKeys: boolean;
	arrowKeys: boolean;
	arrowEdges: boolean;
	linkArrows: boolean;
	routeLinks: boolean;
	compact: boolean;
	balanceFrom: number;
	hGap: number;
	vGap: number;
	inheritColor: boolean;
	renamePasted: boolean;
	autoSize: boolean;
	maxWidth: number;
	/** Groups wrap their contents and overlaps are pushed apart. */
	zones: boolean;
	/** Cmd/Ctrl+Shift+M on a canvas moves the selected nodes to a zone. */
	zoneKey: boolean;
	/** Collapsed branches, by canvas path, then by the collapsed node's id. Not shown in the settings tab. */
	folds: Record<string, Record<string, Fold>>;
}

export const DEFAULT_SETTINGS: Settings = {
	autoLayout: true,
	enterInEdit: true,
	tabAddsChild: false,
	mobileKeys: false,
	arrowKeys: true,
	arrowEdges: true,
	linkArrows: true,
	routeLinks: true,
	compact: true,
	balanceFrom: 5,
	hGap: 160,
	vGap: 20,
	inheritColor: true,
	renamePasted: true,
	autoSize: true,
	maxWidth: 320,
	zones: false,
	zoneKey: true,
	folds: {},
};

type ToggleKey = "autoLayout" | "enterInEdit" | "tabAddsChild" | "mobileKeys" | "arrowKeys" | "arrowEdges" | "linkArrows" | "routeLinks" | "compact" | "inheritColor" | "autoSize" | "renamePasted" | "zones" | "zoneKey";
type SliderKey = "hGap" | "vGap" | "maxWidth" | "balanceFrom";
type SettingSpec =
	| { kind: "toggle"; key: ToggleKey; name: string; desc: string }
	| { kind: "slider"; key: SliderKey; name: string; desc: string; min: number; max: number; step: number };

interface SettingSection { heading: string; specs: SettingSpec[] }

/** The settings, grouped the way the tab shows them. */
function settingSections(): SettingSection[] {
	const s = t();
	return [
		{
			heading: s.secKeys,
			specs: [
				{ kind: "toggle", key: "enterInEdit", name: s.enterInEdit, desc: s.enterInEditDesc },
				{ kind: "toggle", key: "tabAddsChild", name: s.tabAddsChild, desc: s.tabAddsChildDesc },
				{ kind: "toggle", key: "mobileKeys", name: s.mobileKeys, desc: s.mobileKeysDesc },
				{ kind: "toggle", key: "arrowKeys", name: s.arrowKeys, desc: s.arrowKeysDesc },
				{ kind: "toggle", key: "arrowEdges", name: s.arrowEdges, desc: s.arrowEdgesDesc },
			],
		},
		{
			heading: s.secLayout,
			specs: [
				{ kind: "toggle", key: "autoLayout", name: s.autoLayout, desc: s.autoLayoutDesc },
				{ kind: "slider", key: "hGap", name: s.hGap, desc: s.hGapDesc, min: 80, max: 400, step: 10 },
				{ kind: "slider", key: "vGap", name: s.vGap, desc: s.vGapDesc, min: 0, max: 200, step: 10 },
				{ kind: "toggle", key: "compact", name: s.compact, desc: s.compactDesc },
				{ kind: "slider", key: "balanceFrom", name: s.balanceFrom, desc: s.balanceFromDesc, min: 0, max: 12, step: 1 },
			],
		},
		{
			heading: s.secNodes,
			specs: [
				{ kind: "toggle", key: "autoSize", name: s.autoSize, desc: s.autoSizeDesc },
				{ kind: "slider", key: "maxWidth", name: s.maxWidth, desc: s.maxWidthDesc, min: 160, max: 800, step: 20 },
				{ kind: "toggle", key: "inheritColor", name: s.inheritColor, desc: s.inheritColorDesc },
			],
		},
		{
			heading: s.secArrows,
			specs: [
				{ kind: "toggle", key: "linkArrows", name: s.linkArrows, desc: s.linkArrowsDesc },
				{ kind: "toggle", key: "routeLinks", name: s.routeLinks, desc: s.routeLinksDesc },
			],
		},
		{
			heading: s.secZones,
			specs: [
				{ kind: "toggle", key: "zoneKey", name: s.zoneKey, desc: s.zoneKeyDesc },
				{ kind: "toggle", key: "zones", name: s.zones, desc: s.zonesDesc },
			],
		},
		{ heading: s.secFiles, specs: [{ kind: "toggle", key: "renamePasted", name: s.renamePasted, desc: s.renamePastedDesc }] },
	];
}

export interface SettingsHost extends Plugin {
	settings: Settings;
	saveSettings(): Promise<void>;
}

export class SettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: SettingsHost) {
		super(app, plugin);
	}

	/** 1.13+: declarative settings, searchable from the settings window. Values go through plugin.settings. */
	getSettingDefinitions(): SettingDefinitionItem[] {
		const intro: SettingDefinitionItem = { name: t().howTitle, desc: t().howDesc };
		return [
			intro,
			...settingSections().map((section): SettingDefinitionItem => ({ type: "group", heading: section.heading, items: section.specs.map(definitionOf) })),
		];
	}

	/** Before 1.13 (minAppVersion is 1.8.7). */
	display() {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl).setName(t().howTitle).setDesc(t().howDesc);
		for (const section of settingSections()) {
			new Setting(containerEl).setName(section.heading).setHeading();
			for (const spec of section.specs) this.row(containerEl, spec);
		}
	}

	private row(containerEl: HTMLElement, spec: SettingSpec) {
		const row = new Setting(containerEl).setName(spec.name).setDesc(spec.desc);
		if (spec.kind === "toggle") {
			const key = spec.key;
			row.addToggle((tg) =>
				tg.setValue(this.plugin.settings[key]).onChange(async (v) => {
					this.plugin.settings[key] = v;
					await this.plugin.saveSettings();
				}),
			);
		} else {
			const key = spec.key;
			row.addSlider((sl) =>
				sl
					.setLimits(spec.min, spec.max, spec.step)
					.setValue(this.plugin.settings[key])
					.onChange(async (v) => {
						this.plugin.settings[key] = v;
						await this.plugin.saveSettings();
					}),
			);
		}
	}
}

function definitionOf(spec: SettingSpec): SettingDefinition {
	return spec.kind === "toggle"
		? { name: spec.name, desc: spec.desc, control: { type: "toggle", key: spec.key, defaultValue: DEFAULT_SETTINGS[spec.key] } }
		: {
				name: spec.name,
				desc: spec.desc,
				control: { type: "slider", key: spec.key, min: spec.min, max: spec.max, step: spec.step, defaultValue: DEFAULT_SETTINGS[spec.key] },
			};
}
