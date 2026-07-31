import { Plugin } from 'obsidian';
import { registerAnnotateMenu } from './annotate';

export default class BetterAnnotatePlugin extends Plugin {
	onload() {
		registerAnnotateMenu(this);
	}
}
