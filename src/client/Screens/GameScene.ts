import { CascadedShadowGenerator } from "@babylonjs/core/Lights/Shadows/cascadedShadowGenerator";
import { Scene, ScenePerformancePriority } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";

import State from "./Screens";
import { PlayerInput } from "../Controllers/PlayerInput";
import { UserInterface } from "../Controllers/UserInterface";
import { Player } from "../Entities/Player";
import { Entity } from "../Entities/Entity";
import { Item } from "../Entities/Item";
import { Room } from "colyseus.js";
import { NavMesh } from "../../shared/Libs/yuka-min";

import { createConvexRegionHelper } from "../Utils/navMeshHelper";
import { mergeMesh } from "../Entities/Common/MeshHelper";
import { GameController } from "../Controllers/GameController";
import loadNavMeshFromString from "../Utils/loadNavMeshFromString";
import { PlayerInputs, ServerMsg } from "../../shared/types";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VatController } from "../Controllers/VatController";
import { SceneOptimizer, SceneOptimizerOptions } from "@babylonjs/core/Misc/sceneOptimizer";

export class GameScene {
    public _game: GameController;
    public _scene: Scene;
    public _input: PlayerInput;
    public _ui;
    public _shadow: CascadedShadowGenerator;
    public _navMesh: NavMesh;
    public _navMeshDebug;

    public _roomId: string;
    public room: Room<any>;
    public chatRoom: Room<any>;
    public _currentPlayer: Player;
    public _loadedAssets: AssetContainer[] = [];

    public gameData;

    public _entities: Map<string, Player | Entity | Item> = new Map();

    constructor() {}

    async createScene(game): Promise<void> {
        // app
        this._game = game;

        // show loading screen
        this._game.engine.displayLoadingUI();

        // create scene
        let scene = new Scene(this._game.engine);

        // set scene
        this._scene = scene;

        // if no user logged in, force a auto login
        // to be remove later or
        if (!this._game.isLoggedIn()) {
            await this._game.forceLogin();
        }

        // check if user token is valid
        let user = await this._game.isValidLogin();
        if (!user) {
            // if token not valid, send back to login screen
            this._game.setScene(State.LOGIN);
        }

        // performance
        scene.performancePriority = ScenePerformancePriority.Intermediate;

        // get location details
        let location = this._game.currentLocation;

        // add background  color
        scene.clearColor = new Color4(location.skyColor, location.skyColor, location.skyColor, 1);

        // add sun
        if (location.sun) {
            var ambientLight = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);
            ambientLight.intensity = location.sunIntensity;
            ambientLight.groundColor = new Color3(0.13, 0.13, 0.13);
            ambientLight.specular = Color3.Black();
        }

        // add fog
        if (location.fog === true) {
            scene.fogMode = Scene.FOGMODE_LINEAR;
            scene.fogStart = 60.0;
            scene.fogEnd = 120.0;
            scene.fogColor = new Color3(0.9, 0.9, 0.85);
        }

        // shadow light
        /*
        var light = new DirectionalLight("DirectionalLight", new Vector3(-1, -2, -1), scene);
        light.position = new Vector3(1, 10, 1);
        light.radius = 0.27;
        light.intensity = 0.5;
        light.autoCalcShadowZBounds = true;

        // shadow generator
        // toto: something is wrong with the shadows.
        this._shadow = new CascadedShadowGenerator(1024, light);
        this._shadow.filteringQuality = CascadedShadowGenerator.QUALITY_LOW;
        this._shadow.lambda = 0.82;
        this._shadow.bias = 0.018;*/

        // load navmesh
        this._navMesh = await this.loadNavMesh(location.key);
        this._navMeshDebug = createConvexRegionHelper(this._navMesh, this._scene); // function to show the navmesh as a mesh in-game
        this._navMeshDebug.isVisible = false;

        // initialize assets controller & load level
        this._game.initializeAssetController();
        await this._game._assetsCtrl.loadLevel(location.key);
        this._game.engine.displayLoadingUI();

        // preload any skeletons and animation
        let spawns = location.dynamic.spawns ?? [];
        this._game._vatController = new VatController(this._game, spawns);

        await this._game._vatController.initialize();
        await this._game._vatController.check(this._game._currentCharacter.race);
        console.log("[VAT] loaded", this._game._vatController._entityData);

        // init network
        this._initNetwork();
    }

    public async loadNavMesh(key) {
        return await loadNavMeshFromString(key);
    }

    private async _initNetwork(): Promise<void> {
        // join global chat room if not already connected
        if (!this._game.currentChat) {
            this._game.currentChat = await this._game.client.joinChatRoom({ name: this._game._currentCharacter.name });
        }

        // join the game room and use chat room session ID
        this.room = await this._game.client.joinOrCreateRoom(
            this._game._currentCharacter.location,
            this._game._currentUser.token,
            this._game._currentCharacter.id
        );
        this._game.currentRoom = this.room;

        if (this.room) {
            // set room onError evenmt
            this.room.onError((code, message) => {
                this._game.setScene(State.LOGIN);
            });

            // set room onLeave event
            this.room.onLeave((code) => {
                if (code === 1006) {
                    this._game.setScene(State.LOGIN);
                }
            });

            // initialize game
            await this._initGame();
        } else {
        }
    }

    private async _initGame() {
        // setup interface
        this._ui = new UserInterface(this._game, this._entities, this._currentPlayer);

        // setup input Controller
        this._input = new PlayerInput(this);

        ////////////////////////////////////////////////////
        //  when a entity joins the room event
        this.room.state.entities.onAdd((entity, sessionId) => {
            // if player
            if (entity.type === "player") {
                var isCurrentPlayer = sessionId === this.room.sessionId;
                //////////////////
                // if player type
                if (isCurrentPlayer) {
                    // create player entity
                    let _player = new Player(sessionId, this._scene, this, entity);

                    // set currentPlayer
                    this._currentPlayer = _player;

                    // add player specific ui
                    this._ui.setCurrentPlayer(_player);

                    // add to entities
                    this._entities.set(sessionId, _player);

                    // player is loaded, let's hide the loading gui
                    this._game.engine.hideLoadingUI();

                    //////////////////
                    // else must be another player
                } else {
                    this._entities.set(sessionId, new Entity(sessionId, this._scene, this, entity));
                }
            }

            // if entity
            if (entity.type === "entity") {
                this._entities.set(sessionId, new Entity(sessionId, this._scene, this, entity));
            }

            // if item
            if (entity.type === "item") {
                this._entities.set(sessionId, new Item(entity.sessionId, this._scene, entity, this.room, this._ui, this._game));
            }
        });

        // when an entity is removed
        this.room.state.entities.onRemove((entity, sessionId) => {
            if (this._entities.has(sessionId)) {
                this._entities.get(sessionId)?.remove();
                this._entities.delete(sessionId);
            }
        });

        ////////////////////////////////////////////////////
        // main game loop

        const lastUpdates = {
            SERVER: Date.now(),
            SLOW: Date.now(),
            PING: Date.now(),
            UI_SERVER: Date.now(),
            UI_SLOW: Date.now(),
        };

        // start game loop
        this._scene.registerBeforeRender(() => {
            // get current delta
            let delta = this._game.engine.getFps();

            // process vat animations
            this._game._vatController.process(delta);

            // iterate through each items
            const currentTime = Date.now();
            this._entities.forEach((entity, sessionId) => {
                // main entity update
                entity.update(delta);

                // server player gameloop
                if (currentTime - lastUpdates["SERVER"] >= 100) {
                    entity.updateServerRate(100);
                }

                // slow game loop
                if (currentTime - lastUpdates["SLOW"] >= 1000) {
                    entity.updateSlowRate(1000);
                    entity.lod(this._currentPlayer);
                }
            });

            // reset timers
            if (currentTime - lastUpdates["SERVER"] >= 100) {
                lastUpdates["SERVER"] = currentTime;
            }
            if (currentTime - lastUpdates["SLOW"] >= 1000) {
                lastUpdates["SLOW"] = currentTime;
            }

            // game update loop
            if (currentTime - lastUpdates["PING"] >= 1000) {
                // send ping to server
                this._game.sendMessage(ServerMsg.PING);
                lastUpdates["PING"] = currentTime;
            }

            // ui update loop
            if (currentTime - lastUpdates["UI_SERVER"] >= 100) {
                this._ui.update();
                lastUpdates["UI_SERVER"] = currentTime;
            }
            if (currentTime - lastUpdates["UI_SLOW"] >= 1000) {
                this._ui.slow_update();
                lastUpdates["UI_SLOW"] = currentTime;
            }
        });
    }

    // triggered on resize event
    public resize() {
        if (this._ui) {
            this._ui.resize();
        }
    }
}
