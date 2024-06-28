import { ItemRarity } from "../types";

const rareColor = "3,148,252";
const legendaryColor = "240,171,28";

export class Rarity {
    static getColor(item, alpha = 0.3) {
        if (item.rarity === ItemRarity.RARE) {
            return "rgba(" + rareColor + "," + alpha + ")";
        } else if (item.rarity === ItemRarity.LEGENDARY) {
            return "rgba(" + legendaryColor + "," + alpha + ")";
        }
        return "rgba(0,0,0,0.5)";
    }

    static getTooltipColor(item, alpha = 0.3) {
        if (item.rarity === ItemRarity.RARE) {
            return "rgba(" + rareColor + "," + alpha + ")";
        } else if (item.rarity === ItemRarity.LEGENDARY) {
            return "rgba(" + legendaryColor + "," + alpha + ")";
        }
        return "rgba(255,255,255, 1)";
    }
}
