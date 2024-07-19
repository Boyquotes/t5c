import { abilityMap, EntityState, CalculationTypes, AbilityType, AbilityElement } from "../../shared/types";

let AbilitiesDB: abilityMap = {
    base_attack: {
        title: "Attack",
        key: "base_attack",
        icon: "ICON_ABILITY_base_attack",
        sound: "hit_b",
        soundDelay: 400,
        description: "A unimpressive attack that deals very little damage.",
        castSelf: false,
        castTime: 0,
        cooldown: 1000,
        repeat: 0,
        repeatInterval: 0,
        range: 0,
        minRange: 3,
        animation: EntityState.ATTACK_HORIZONTAL,
        autoattack: true,
        effect: {
            type: "target",
            particule: "damage",
            color: "white",
        },
        casterPropertyAffected: [],
        targetPropertyAffected: [{ key: "health", type: CalculationTypes.REMOVE, min: 2, max: 5 }],
    },

    slice_attack: {
        title: "Slice Attack",
        key: "slice_attack",
        icon: "ICON_ABILITY_slice_attack",
        sound: "hit_a",
        soundDelay: 800,
        description: "A slice attack that deals big damage.",
        castSelf: false,
        castTime: 0,
        cooldown: 5000,
        repeat: 0,
        repeatInterval: 0,
        range: 0,
        minRange: 3,
        animation: EntityState.ATTACK_VERTICAL,
        effect: {
            type: "target",
            particule: "damage",
            color: "white",
        },
        casterPropertyAffected: [],
        targetPropertyAffected: [{ key: "health", type: CalculationTypes.REMOVE, min: 25, max: 50 }],
    },

    fire_dart: {
        //-((1d17+6+self.int/23)*self.fire/target.r_fire)
        title: "Fire dart",
        key: "fire_dart",
        icon: "ICON_ABILITY_fire_dart",
        sound: "fire_attack_1",
        soundDelay: 100,
        description: "Sends a small flaming projectile towards the target.",
        castSelf: false,
        castTime: 1000,
        cooldown: 1000,
        repeat: 0,
        repeatInterval: 0,
        range: 0,
        minRange: 0,
        animation: EntityState.SPELL_CAST,
        effect: {
            type: "travel",
            particule: "fireball",
            color: "orange",
        },
        casterPropertyAffected: [{ key: "mana", type: CalculationTypes.REMOVE, min: 5, max: 10 }],
        targetPropertyAffected: [{ key: "health", type: CalculationTypes.REMOVE, min: 10, max: 20 }],
        type: AbilityType.PHYSICAL,
        element: AbilityElement.FIRE,
        required_level: 2,
        required_intelligence: 21,
        required_wisdom: 21,
        skill_points: 5,
        value: 532,
    },

    poison: {
        //-((self.int/21)*self.water/target.r_water)
        title: "Poison",
        key: "poison",
        icon: "ICON_ABILITY_poison",
        sound: "fire_attack_1",
        soundDelay: 100,
        description: "Gradually drains the target's HP over an extended period of time.",
        castSelf: false,
        castTime: 0,
        cooldown: 10000,
        repeat: 5,
        repeatInterval: 1000,
        range: 0,
        minRange: 0,
        animation: EntityState.SPELL_CAST,
        effect: {
            type: "travel",
            particule: "fireball",
            color: "green",
        },
        casterPropertyAffected: [{ key: "mana", type: CalculationTypes.REMOVE, min: 5, max: 10 }],
        targetPropertyAffected: [{ key: "health", type: CalculationTypes.REMOVE, min: 4, max: 8 }],
        required_level: 3,
        required_intelligence: 25,
        required_wisdom: 19,
        value: 500,
    },
    light_heal: {
        //(1d5+8+self.wis/23)*self.light/100)
        title: "Light Heal",
        key: "light_heal",
        icon: "ICON_ABILITY_light_heal",
        sound: "heal_1",
        soundDelay: 0,
        description: "Restores health to the target.",
        castSelf: true,
        castTime: 1000,
        cooldown: 1000,
        repeat: 0,
        repeatInterval: 0,
        range: 0,
        minRange: 0,
        animation: EntityState.SPELL_CAST,
        effect: {
            type: "self",
            particule: "heal",
            color: "white",
        },
        casterPropertyAffected: [{ key: "mana", type: CalculationTypes.REMOVE, min: 2, max: 3 }],
        targetPropertyAffected: [{ key: "health", type: CalculationTypes.ADD, min: 30, max: 50 }],
        required_level: 2,
        required_intelligence: 15,
        required_wisdom: 19,
        skill_points: 9,
        value: 897,
    },
};

export { AbilitiesDB };
