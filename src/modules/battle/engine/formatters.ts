
import { BattleParticipant } from '../types';
import { formatCooldown, formatDuration, STATUS_PHRASES } from '../constants';

// Helper to reliably pick a phrase based on inputs
const getStatusPhrase = (phrases: string[], seed: number) => {
    if (!phrases || phrases.length === 0) return "Неизвестно";
    return phrases[seed % phrases.length];
};

// Sort helper: Group by Template ID, then by Name
const sortParticipants = (participants: BattleParticipant[]) => {
    return [...participants].sort((a, b) => {
        // Primary Sort: Group by ID (Template)
        if (a.id !== b.id) {
            return a.id.localeCompare(b.id);
        }
        // Secondary Sort: Name (Natural Order: Rat #1, Rat #2, etc.)
        return a.profile.name.localeCompare(b.profile.name, undefined, { numeric: true, sensitivity: 'base' });
    });
};

export const generateSummary = (participants: BattleParticipant[], round: number): string => {
    let text = "";
    
    // Sort for grouping
    const sortedParticipants = sortParticipants(participants);

    // 1. Status Section
    sortedParticipants.forEach(p => {
        const { trauma_phys = 0, trauma_mag = 0, trauma_uniq = 0 } = p.battle_stats;
        let phrase = "";
        
        const charSeed = p.instance_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const seed = Math.abs(charSeed + trauma_phys + round);

        if (trauma_phys === 0) {
            phrase = getStatusPhrase(STATUS_PHRASES.level_0, seed);
        } else {
            const positiveTrauma = Math.abs(trauma_phys);
            const level = Math.ceil(positiveTrauma / 5) * 5;
            const lookupKey = level > 60 ? 'level_60' : `level_${level}`;
            const phraseSet = STATUS_PHRASES[lookupKey] || STATUS_PHRASES.level_60;
            phrase = getStatusPhrase(phraseSet, seed);
        }

        const parts: string[] = [];
        if (trauma_phys !== 0) parts.push(`Физ: ${trauma_phys}`);
        if (trauma_mag !== 0) parts.push(`Маг: ${trauma_mag}`);
        if (trauma_uniq !== 0) parts.push(`Уник: ${trauma_uniq}`);

        const injuriesText = parts.length > 0 ? `(${parts.join(', ')})` : "";
        text += `${p.profile.name} — ${phrase} ${injuriesText}\n\n`;
    });

    // 2. Split Effects
    const forms: string[] = [];
    const buffs: string[] = [];
    const debuffs: string[] = [];
    
    sortedParticipants.forEach(p => {
        p.active_effects.forEach(eff => {
             const isForm = (eff.tags || []).some(t => t.toLowerCase().includes('form') || t.toLowerCase().includes('форма'));
             const isNegative = eff.bonuses.some(b => b.val < 0);

             const line = `${eff.name} (${p.profile.name}) — ${formatDuration(eff.duration_left, eff.unit)}`;
             
             if (isForm) forms.push(line);
             else if (isNegative) debuffs.push(line);
             else buffs.push(line);
        });
    });

    if (forms.length > 0) {
        text += "Активные Формы:\n" + forms.join('\n') + "\n\n";
    }
    
    if (buffs.length > 0) {
        text += "Активные Баффы:\n" + buffs.join('\n') + "\n\n";
    }

    if (debuffs.length > 0) {
        text += "Активные Ослабления:\n" + debuffs.join('\n') + "\n\n";
    }

    if (forms.length === 0 && buffs.length === 0 && debuffs.length === 0) {
        text += "(Нет активных эффектов)\n\n";
    }

    text += "Перезарядка:\n";
    const battleCDs: string[] = [];
    sortedParticipants.forEach(p => {
        p.cooldowns.forEach(cd => {
             battleCDs.push(`${cd.name} (${p.profile.name}): ${formatCooldown(cd.name, cd.val, cd.unit)}`);
        });
    });

    if (battleCDs.length > 0) text += battleCDs.join('\n') + '\n';
    return text;
};

export const generateStatsText = (participants: BattleParticipant[]) => {
    // Sort for grouping
    const sortedParticipants = sortParticipants(participants);

    return sortedParticipants.map(p => {
        const lines = [];
        // Header: "Name (X ур.)"
        lines.push(`${p.profile.name} (${p.profile.level} ур.)`);
        
        // Stats - Hide (0) if 0
        const pT = p.battle_stats.trauma_phys;
        const mT = p.battle_stats.trauma_mag;
        const uT = p.battle_stats.trauma_uniq;
        
        lines.push(`Физическая характеристика: ${p.stats.phys}${pT !== 0 ? ` (${pT})` : ''}`);
        lines.push(`Магическая характеристика: ${p.stats.magic}${mT !== 0 ? ` (${mT})` : ''}`);
        lines.push(`Уникальная характеристика: ${p.stats.unique}${uT !== 0 ? ` (${uT})` : ''}`);
        
        // Passives - Filter strictly for 'Always'/'Passive' types
        const permanentPassives = p.flat_passives.filter(pas => {
            const t = (pas.trigger || '').toLowerCase().trim();
            return !t || t === 'always' || t === 'passive' || t === 'пассивно' || t === 'всегда' || t === 'пассивно / всегда';
        });

        if (permanentPassives.length > 0) {
            lines.push(`> Пассивные эффекты:`);
            permanentPassives.forEach(pas => {
                lines.push(`${pas.name} (${pas.desc_mech || 'нет описания'})`);
            });
        }

        // Active Effects Logic
        const forms = [];
        const buffs = [];
        const debuffs = [];

        p.active_effects.forEach(e => {
            const isForm = (e.tags || []).some(t => t.toLowerCase().includes('form') || t.toLowerCase().includes('форма'));
            
            // Check for negative bonus to classify as debuff
            const isNegative = e.bonuses.some(b => b.val < 0);

            const line = `${e.name} (ост. ${formatDuration(e.duration_left, e.unit)})`;

            if (isForm) forms.push(line);
            else if (isNegative) debuffs.push(line);
            else buffs.push(line);
        });

        if (forms.length > 0) {
            lines.push(`> Формы:`);
            forms.forEach(l => lines.push(l));
        }

        if (buffs.length > 0) {
            lines.push(`> Баффы:`);
            buffs.forEach(l => lines.push(l));
        }

        if (debuffs.length > 0) {
            lines.push(`> Ослабления:`);
            debuffs.forEach(l => lines.push(l));
        }

        return lines.join('\n');
    }).join('\n\n\n');
};
