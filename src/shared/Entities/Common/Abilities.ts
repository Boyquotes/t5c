import { AbilitiesDB } from "../../Data/AbilitiesDB";

export class Abilities {
    public static get(key) {
        if (AbilitiesDB[key]) {
            return AbilitiesDB[key];
        }
        return false;
    }
    public static getByDigit(player, digit) {
        let key = player.abilities[digit];
        if (AbilitiesDB[key]) {
            return AbilitiesDB[key];
        }
        return false;
    }
    public static loadAll() {
        return AbilitiesDB;
    }
}
