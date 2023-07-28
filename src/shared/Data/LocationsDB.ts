import { Vector3 } from "../yuka-min";

let LocationsDB = {
    lh_town: {
        title: "Town",
        key: "lh_town",
        mesh: "lh_town",
        sun: true,
        sunIntensity: 2.5,
        spawnPoint: {
            x: 0,
            y: 0,
            z: 0,
            rot: -180,
        },
        monsters: 10,
        waterPlane: true,
        skyColor: 255,
        dynamic: {
            spawns: [
                {
                    type: "global",
                    behaviour: "patrol",
                    aggressive: false,
                    description: "will randomly patrol along the navmesh",
                    points: [],
                    radius: 0,
                    amount: 1,
                    race: "male_enemy",
                },
                {
                    type: "area",
                    behaviour: "patrol",
                    aggressive: true,
                    description: "will patrol towards a random point then head to another random point",
                    points: [
                        new Vector3(-20.3, 0, -7.49),
                        new Vector3(-35, 0, -8.75),
                        new Vector3(-21, 0, -21),
                        new Vector3(-36, 0, -36),
                        new Vector3(-18, 0, -10),
                    ],
                    radius: 0,
                    amount: 10,
                    race: "male_enemy",
                },
                {
                    type: "path",
                    behaviour: "patrol",
                    aggressive: true,
                    description:
                        "Will patrol along a path of points going back and forth (not sure about this one, maybe once it gets to the end it should go back to the first point?)",
                    points: [new Vector3(-14, 0, 3.6), new Vector3(-3.7, 0, 3.4), new Vector3(-3.7, 0, 15.3), new Vector3(-13.45, 0, 14.63)],
                    radius: 0,
                    amount: 1,
                    race: "male_enemy",
                },
            ],
        },
    },
    lh_dungeon_01: {
        title: "Dungeon Level 1",
        key: "lh_dungeon_01",
        mesh: "lh_dungeon_01",
        sun: false,
        sunIntensity: 1,
        spawnPoint: {
            x: 11.33,
            y: 0,
            z: -2.51,
            rot: -180,
        },
        monsters: 5,
        waterPlane: false,
        skyColor: 0,
        dynamic: {
            spawns: [
                {
                    type: "global",
                    behaviour: "patrol",
                    aggressive: true,
                    description: "will randomly patrol along the navmesh",
                    points: [],
                    radius: 0,
                    amount: 5,
                    race: "male_enemy",
                },
            ],
        },
    },
};

export { LocationsDB };
