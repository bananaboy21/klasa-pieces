const { Extendable } = require('klasa');
const { Channel, Message } = require('discord.js');
const { regExpEsc } = require('../util/util');

const CHANNEL_REGEXP = new RegExp('^(?:<#)?(\\d{17,21})>?$');

function resolveChannel(query, guild) {
	if (query instanceof Channel) return guild.channels.has(query.id) ? query : null;
	if (query instanceof Message) return query.guild.id === guild.id ? query.channel : null;
	if (typeof query === 'string' && CHANNEL_REGEXP.test(query)) return guild.channels.get(CHANNEL_REGEXP.exec(query)[1]);
	return null;
}

module.exports = class extends Extendable {

	constructor(...args) {
		super(...args, ['ArgResolver'], { klasa: true });
	}

	async extend(arg, currentUsage, possible, repeat, msg) {
		if (!msg.guild) return this.channel(arg, currentUsage, possible, repeat, msg);
		const resChannel = resolveChannel(arg, msg.guild);
		if (resChannel) return resChannel;

		const results = [];
		const reg = new RegExp(regExpEsc(arg), 'i');
		for (const channel of msg.guild.channels.values()) {
			if (reg.test(channel.name)) results.push(channel);
		}

		let querySearch;
		if (results.length > 0) {
			const regWord = new RegExp(`\\b${regExpEsc(arg)}\\b`, 'i');
			const filtered = results.filter(channel => regWord.test(channel.name));
			querySearch = filtered.length > 0 ? filtered : results;
		} else {
			querySearch = results;
		}

		switch (querySearch.length) {
			case 0:
				if (currentUsage.type === 'optional' && !repeat) return null;
				throw `${currentUsage.possibles[possible].name} Must be a valid name, id or channel mention`;
			case 1: return querySearch[0];
			default: throw `Found multiple matches: \`${querySearch.map(user => user.tag).join('`, `')}\``;
		}
	}

};
