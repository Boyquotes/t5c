import { 
    Scene, Engine, Vector3, MeshBuilder, Color3, SpotLight,
     ShadowGenerator, CubeTexture, Texture, StandardMaterial, 
     Mesh,Matrix,Quaternion,SceneLoader,
     DirectionalLight, PointLight,HemisphericLight,
     AssetsManager, AssetContainer, MeshAssetTask, ContainerAssetTask 
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button } from "@babylonjs/gui";
import {  } from "@babylonjs/materials";
import State from "./Screens";

import { PlayerInput } from "../Controllers/inputController";
import { Environment } from "../Controllers/environment";
import { Hud } from "../Controllers/ui";
import { Player } from "../../shared/Entities/Player";

import { Room } from "colyseus.js";

export class GameScene {

    public _scene: Scene;
    public _client;
    private _engine: Engine;
    public _newState: State;
    private _gui: AdvancedDynamicTexture;
    public _button: Button;
    public _assetsManager: AssetsManager;
    public _assets = [];
    private _input;
    private _ui;
    private _shadow: ShadowGenerator;
    private _environment: Environment;

    public _roomId: string;
    private room: Room<any>;
    private playerEntities: Player[] = [];
    private _currentPlayer;

    public _loadedAssets;

    constructor() {

    }

    async createScene(engine, client): Promise<void> {

        // get current roomID from globals
        this._roomId = window.currentRoomID;
        this._client = client;

        // create scene
        let scene = new Scene(engine);
        scene.shadowsEnabled = true;

        // ambient light
        var ambientLight = new HemisphericLight(
            "light1",
            new Vector3(0, 1, 0),
            scene
        );
        ambientLight.intensity = 2;
        ambientLight.groundColor = new Color3(0.13, 0.13, 0.13);
        ambientLight.specular = Color3.Black();

        // shadow light
        var light = new DirectionalLight("DirectionalLight", new Vector3(0, -1, 0), scene);
        light.intensity = 1;

        // add sky box
        var skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
        var skyboxMaterial = new StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new CubeTexture("textures/skybox", scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        skyboxMaterial.specularColor = new Color3(0, 0, 0);
        skybox.material = skyboxMaterial;

        // shadow generator
        this._shadow = new ShadowGenerator(1024, light);
        this._shadow.bias = 0.001;
        this._shadow.normalBias = 0.02;
        this._shadow.useContactHardeningShadow = true;
        this._shadow.contactHardeningLightSizeUVRatio = 0.05;
        this._shadow.setDarkness(0.5);

        //
        //scene.environmentTexture = CubeTexture.CreateFromPrefilteredData('textures/skybox.dds', scene)

        // set scene
        this._scene = scene;

        await this._loadAssets();

    }

    private async _loadAssets(): Promise<void> {

        //--CREATE ENVIRONMENT--
        const environment = new Environment(this._scene);
        this._environment = environment;
        //Load environment and character assets
        await this._environment.load(); //environment

        /*
        this._loadedAssets = [];

        var container = new AssetContainer(this._scene);

        this._assetsManager = new AssetsManager(this._scene);
        this._assetsManager.addContainerTask("player_mesh", "", "./models/", "player_fixed.glb");
        this._assetsManager.load();

        this._assetsManager.onFinish = function(meshes) {
           console.log('MESH LOADED', meshes);
           meshes.forEach((task: MeshAssetTask) => {
                console.log(task);
                this._loadedAssets.push({
                    "meshes": task.loadedMeshes[0]
                })
           });
          
        };*/

        await this._initNetwork(this._client);
    }

    //load the character model
    private async _loadCharacterAssets(scene): Promise<any> {

        async function loadCharacter() {
            //collision mesh
            const outer = MeshBuilder.CreateBox("outer", { width: 2, depth: 1, height: 3 }, scene);
            outer.isVisible = false;
            outer.isPickable = false;
            outer.checkCollisions = true;

            //move origin of box collider to the bottom of the mesh (to match player mesh)
            outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0))
            //for collisions
            outer.ellipsoid = new Vector3(1, 1.5, 1);
            outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

            outer.rotationQuaternion = new Quaternion(0, 1, 0, 0); // rotate the player mesh 180 since we want to see the back of the player
            
            //--IMPORTING MESH--
            return SceneLoader.ImportMeshAsync(null, "./models/", "player_fixed.glb", scene).then((result) =>{
                const root = result.meshes[0];
                //body is our actual player mesh
                const body = root;
                body.parent = outer;
                body.isPickable = false;
                body.getChildMeshes().forEach(m => {
                    m.isPickable = false;
                })
                
                //return the mesh and animations
                return {
                    mesh: outer as Mesh,
                    animationGroups: result.animationGroups
                }
            });
        }

        return loadCharacter().then(assets => {
            this._loadedAssets = assets;
        });
    }

    private async _initNetwork(client): Promise<void> {

        console.log(this._assetsManager);

        await this._scene.whenReadyAsync();

        try {

            if (this._roomId) {
                this.room = await client.join("game_room", { roomId: this._roomId });
            } else {
                this.room = await client.create("game_room");
                this._roomId = this.room.roomId;
                window.currentRoomID = this._roomId;
            }

            if (this.room) {
                await this._initEvents();
            }

        } catch (e) {
            console.error("join error", e);
        }

    }

    private async _initEvents() {

        // setup player input
        // todo: probably should be in the player class
        this._input = new PlayerInput(this._scene);

        // setup hud
        this._ui = new Hud(this._scene, this.room);

        // when someone joins the room event
        this.room.state.players.onAdd((entity, sessionId) => {

            var isCurrentPlayer = sessionId === this.room.sessionId;

            let _player = new Player(entity, isCurrentPlayer, sessionId, this._scene, this._ui, this._input, this._shadow);

            // if current player, save entity ref
            if (isCurrentPlayer) {

                // set currentPlayer (probably not useful)
                this._currentPlayer = _player;

                //this._setupGUI();
                console.log('ADDING CURRENT PLAYER', entity, this._currentPlayer);
            }

            // save entity
            this.playerEntities[sessionId] = _player;

        });

        // when someone leave the room event
        this.room.state.players.onRemove((player, sessionId) => {
            this.playerEntities[sessionId].characterLabel.dispose();
            this.playerEntities[sessionId].mesh.dispose();
            delete this.playerEntities[sessionId];
        });

        // main loop
        let timeThen = Date.now();
        this._scene.registerBeforeRender(() => {

            // continuously lerp movement
            for (let sessionId in this.playerEntities) {
                const entity = this.playerEntities[sessionId];
                entity.mesh.position = Vector3.Lerp(entity.mesh.position, entity.playerNextPosition, 0.3);
                entity.mesh.rotation = Vector3.Lerp(entity.mesh.rotation, entity.playerNextRotation, 0.8);
            }

            // detect movement
            if (this._input.moving) {
                this._currentPlayer.processMove();
            }

            // main game loop
            let timeNow = Date.now();
            let timePassed = (timeNow - timeThen) / 1000;
            let updateRate = 0.1;
            if (timePassed >= updateRate) {

                // detect movement
                if (this._input.moving) {
    
                    /*
                    this.room.send("playerPosition", {
                        x: this._currentPlayer.playerNextPosition.x,
                        y: this._currentPlayer.playerNextPosition.y,
                        z: this._currentPlayer.playerNextPosition.z,
                        rot: this._currentPlayer.playerNextRotation.y
                    });
                    */
                    let seq = 1;
                    let input = {
                        seq: seq,
                        h: this._input.horizontal, 
                        v: this._input.vertical
                    }
                    //this._currentPlayer.playerInputs[seq] = input;

                    this.room.send("playerInput", input);

                }

                timeThen = timeNow;
            }

        })

    }

}