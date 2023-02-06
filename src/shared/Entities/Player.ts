import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { CascadedShadowGenerator } from "@babylonjs/core/Lights/Shadows/cascadedShadowGenerator";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";

import { EntityState } from "../../server/rooms/schema/EntityState";
import { EntityCamera } from "./Entity/EntityCamera";
import { EntityUtils } from "./Entity/EntityUtils";
import { EntityActions } from "./Entity/EntityActions";
import { Entity } from "./Entity";
import { PlayerInput } from "../../client/Controllers/PlayerInput";
import { UserInterface } from "../../client/Controllers/UserInterface";
import { Room } from "colyseus.js";
import { NavMesh } from "../yuka";
import Locations from "../Data/Locations";
import { Abilities } from "../Data/Abilities";
import Config from "../Config";
import State from "../../client/Screens/Screens";
import { roundTo } from "../Utils";

export class Player extends Entity {
    public input;
    public interval;

    public isCasting: boolean = false;
    public castingDigit: number = 0;
    public castingTimer;
    public castingElapsed: number = 0;
    public castingTarget: number = 0;

    public ability_in_cooldown;

    constructor(
        entity: EntityState,
        room: Room,
        scene: Scene,
        ui: UserInterface,
        shadow: CascadedShadowGenerator,
        navMesh: NavMesh,
        assetsContainer: AssetContainer[],
        input: PlayerInput
    ) {
        super(entity, room, scene, ui, shadow, navMesh, assetsContainer);

        this._input = input;

        this.ability_in_cooldown = [false, false, false, false, false, false, false, false, false, false, false];

        this.spawnPlayer();
    }

    private async spawnPlayer() {
        //spawn
        this.utilsController = new EntityUtils(this._scene, this._room);
        this.cameraController = new EntityCamera(this._scene, this._input);
        this.actionsController = new EntityActions(this._scene);

        ///////////////////////////////////////////////////////////
        // entity network event
        // colyseus automatically sends entity updates, so let's listen to those changes

        //////////////////////////////////////////////////////////////////////////
        // player register event

        // register server messages
        this.registerServerMessages();

        // mouse events
        this._scene.onPointerObservable.add((pointerInfo: any) => {
            // on left mouse click
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 0) {
                //console.log(pointerInfo._pickInfo);

                /////////////////////////////////////////////////////////////////////
                // if click on entity
                if (
                    pointerInfo._pickInfo.pickedMesh &&
                    pointerInfo._pickInfo.pickedMesh.metadata &&
                    pointerInfo._pickInfo.pickedMesh.metadata !== null &&
                    pointerInfo._pickInfo.pickedMesh.metadata.race
                ) {
                    let metadata = pointerInfo._pickInfo.pickedMesh.metadata;
                    let targetSessionId = metadata.sessionId;
                    let target = this.ui._entities[targetSessionId];

                    if (metadata.type === "player" && targetSessionId === this.sessionId) {
                        target = this.ui._currentPlayer;
                    }

                    global.T5C.selectedEntity = target;
                }
            }

            // on right mouse click
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 2) {
                /////////////////////////////////////////////////////////////////////
                // display nameplate for a certain time for any entity right clicked
                if (
                    pointerInfo._pickInfo.pickedMesh &&
                    pointerInfo._pickInfo.pickedMesh.metadata &&
                    pointerInfo._pickInfo.pickedMesh.metadata.sessionId &&
                    pointerInfo._pickInfo.pickedMesh.metadata.sessionId != this._room.sessionId
                ) {
                    let targetMesh = pointerInfo._pickInfo.pickedMesh;
                    let targetData = targetMesh.metadata;
                    let target = this.ui._entities[targetData.sessionId];
                    target.characterLabel.isVisible = true;
                    setTimeout(function () {
                        target.characterLabel.isVisible = false;
                    }, Config.PLAYER_NAMEPLATE_TIMEOUT);
                }
            }
        });

        //////////////////////////////////////////////////////////////////////////
        // player before render loop
        this._scene.registerBeforeRender(() => {
            // move camera as player moves
            this.cameraController.follow(this.mesh.position);
        });
    }

    public update(delta) {
        // tween entity
        if (this && this.moveController) {
            this.moveController.tween();
        }

        // if digit pressed
        if (this._input.digit_pressed > 0 && !this.isCasting) {
            // get all necessary vars
            let digit = this._input.digit_pressed;
            let target = global.T5C.selectedEntity;

            // send to server
            this._room.send("entity_ability_key", {
                senderId: this._room.sessionId,
                targetId: target ? target.sessionId : false,
                digit: digit,
            });

            // clear digit
            this._input.digit_pressed = false;
        }

        // check if casting
        if (this.isCasting === true) {
            // increment casting timer
            this.ui._UICastingTimer.isVisible = true;
            this.castingElapsed += delta;
            this.ui._UICastingTimer.text = "Casting: " + roundTo(this.castingElapsed, 0) + "/" + this.castingTarget;
            console.log("CASTING.....", this.ui._UICastingTimer.text);
        }

    }

    public getAbilityFromDigit(digit) {
        let ability_no = this.raceData.abilities[digit];
        return Abilities[ability_no];
    }

    public startCasting(data) {
        let digit = data.digit;
        let ability = this.getAbilityFromDigit(digit);

        // player is casting
        this.isCasting = true;
        this.castingElapsed = 0;
        this.castingTarget = ability.castTime;
        this.castingDigit = digit;
        this.ui._UICastingTimer.isVisible = true;
        this.ui._UICastingTimer.text = "Start Casting";
        console.log("SERVER CONFIRM PLAYER CAN START CASTING", this.isCasting, data);
    }

    //////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////
    // server message handler

    public registerServerMessages() {
        // on teleport confirmation
        this._room.onMessage("playerTeleportConfirm", (location) => {
            this.actionsController.teleport(this._room, location);
        });

        // server confirm player can start casting
        this._room.onMessage("ability_start_casting", (data) => {
            this.startCasting(data);
        });

        // server confirms ability can be cast
        this._room.onMessage("entity_ability_cast", (data) => {
            console.log("CASTING ABILITY ON CLIENT", this.isCasting, data);

            // remove any casting timers
            this.castingElapsed = 0;
            this.castingTarget = 0;
            this.isCasting = false;
            this.ui._UICastingTimer.isVisible = false;
            this.ui._UICastingTimer.text = 0;

            // 
            let digit = data.digit;
            let ability = Abilities[data.key];
            let cooldownUI = this.ui._playerUI.getControlByName('ability_'+digit+'_cooldown');
            cooldownUI.isVisible = true;
            console.log('STARTING COOLDOWN', cooldownUI, ability.cooldown);
            setTimeout(() => {
                cooldownUI.isVisible = false;
                console.log('FINISH COOLDOWN', cooldownUI, ability.cooldown);
            }, ability.cooldown);

            // action ability
            this.actionsController.process(data);
        });
    }

    //////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////
    // to refactor

    public async teleport(location) {
        await this._room.leave();
        global.T5C.currentLocation = Locations[location];
        global.T5C.currentLocationKey = location;
        global.T5C.currentCharacter.location = location;
        global.T5C.currentRoomID = "";
        global.T5C.nextScene = State.GAME;
    }

    public remove() {
        this.characterLabel.dispose();
        this.characterChatLabel.dispose();
        this.mesh.dispose();
        if (global.T5C.selectedEntity && global.T5C.selectedEntity.sessionId === this.sessionId) {
            global.T5C.selectedEntity = false;
        }
    }
}
