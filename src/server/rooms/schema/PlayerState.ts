import { type } from "@colyseus/schema";
import Logger from "../../../shared/Logger";
import Config from "../../../shared/Config";
import { PlayerInputs } from "../../../shared/types";
import { EntityCurrentState } from "../../../shared/Entities/Entity/EntityCurrentState";
import { EntityState } from "../schema/EntityState";
import { Vector3 } from "../../../shared/yuka";
import { GameRoom } from "../GameRoom";
import Abilities from "../../../shared/Data/Abilities";

export class PlayerState extends EntityState {

  // networked player specific
  @type('number') public experience: number = 0;
  @type('number') public strength: number = 0;
  @type('number') public endurance: number = 0;
  @type('number') public agility: number = 0;
  @type('number') public intelligence: number = 0;
  @type('number') public wisdom: number = 0;

  // 
  public player_interval;
  public player_cooldown: number = 1000;
  public ability_in_cooldown: boolean[];
  public player_cooldown_timer: number = 0;

  constructor(gameroom:GameRoom, ...args: any[]) {
		super(gameroom, args);

    this.ability_in_cooldown = [
      false, 
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ];

	}

  // runs on every server iteration
  update(){

    //
    this.isMoving = false;

    if(this.isEntityDead()){
      this.setAsDead();
    }

    // if not dead 
    if(this.isDead === false){

      // continuously gain mana
      if(this.mana < this.raceData.maxMana){
        this.mana += this.raceData.manaRegen;
      }

      // continuously gain health
      if(this.health < this.raceData.maxHealth){
        this.health += this.raceData.healthRegen;
      }
    }

  }

  processAbility(target, data){

    // get ability 
    let ability_no = data.digit;

    // if target is not already dead
    if(target.isEntityDead()){
      Logger.error(`[gameroom][processAbility] target is dead`, target.health);
      return false;
    }

    // if in cooldown
    if(this.ability_in_cooldown[ability_no]){
      Logger.info(`[gameroom][processAbility] ability is in cooldown`, ability_no);
      return false;
    }

    // get ability
    let ability_key = (this.raceData.abilities && this.raceData.abilities[ability_no]) ?? false;
    let ability = Abilities[ability_key] ?? false;

    // if ability not found, cancel everything
    if(!ability){
      Logger.error(`[gameroom][processAbility] ability not found`, ability);
      return false;
    }

    // only cast ability if enought mana is available
    if(this.mana < ability.manaCost){
      Logger.info(`[gameroom][processAbility] not enough mana available`, this.mana);
      return false;
    }

    // rotate sender to face target
    this.rot = this.calculateRotation(this.getPosition(), target.getPosition());

    // set target as target
    if(target.type === 'entity'){
      target.setTarget(this); 
    }

    // start cooldown period
    this.ability_in_cooldown[ability_no] = true;
    setTimeout(() => {
      this.ability_in_cooldown[ability_no] = false;
    }, ability.cooldown);

    // sender cannot hurt himself
    if(ability.type === 'direct' && target.sessionId === this.sessionId){
      Logger.info(`[gameroom][processAbility] cannot hurt yourself`, data);
      return false;
    }

    // target lose health
    if(ability.type === 'direct'){
      target.loseHealth(ability.value);
    }

    // target gains health
    if(ability.type === 'heal'){
      target.winHealth(ability.value);
    }

    // sender loses mana
    this.mana -= ability.manaCost;
    if(this.mana < 0){
      this.mana = 0;
    }

    // send to clients
    this._gameroom.broadcast("ability_update", {
        key: ability.key,
        fromId: this.sessionId,
        fromPos: this.getPosition(),
        targetId: target.sessionId,
        targetPos: {
            x: target.x,
            y: target.y,
            z: target.z,
        }
    });

    // if target has no more health
    if(target.isEntityDead()){ 
      console.log('SET AS DEAD');
      // set player as dead
      target.setAsDead();
    }

  }

  getPosition(){
    return new Vector3(this.x, this.y, this.z);
  }

  setAsDead(){

    this.isDead = true;
    this.health = 0;
    this.blocked = true;
    this.state = EntityCurrentState.DEAD;

    // revive player after 10 seconds
    setTimeout(()=>{
      this.isDead = false;
      this.health = 100;
      this.blocked = false;
      this.state = EntityCurrentState.IDLE
    }, 10000);
    
  }

  /**
   * is entity dead (isDead is there to prevent setting a player as dead multiple time)
   * @returns true if health smaller than 0 and not already set as dead. 
   */
  isEntityDead(){
    return this.health <= 0 && this.isDead === false;
  }

  setLocation(location:string):void {
    this.location = location;
  }

  setPosition(updatedPos:Vector3):void{
    this.x = updatedPos.x;
    this.y = updatedPos.y;
    this.z = updatedPos.z;
  }

  /**
   * Check if player can move from sourcePos to newPos
   * @param {Vector3} sourcePos source position
   * @param {Vector3} newPos destination position
   * @returns boolean
   */
  canMoveTo(sourcePos:Vector3, newPos:Vector3):boolean{
    return this._navMesh.checkPath(sourcePos, newPos);
  }

  /**
   * Calculate next forward position on the navmesh based on playerInput forces
   * @param {PlayerInputs} playerInput 
   * @returns 
   */
  processPlayerInput(playerInput:PlayerInputs) {

      if(this.blocked){
        this.state = EntityCurrentState.IDLE;
        Logger.warning('Player '+this.name+' is blocked, no movement will be processed');
        return false;
      }

      // cancel any moveTo event
      //this.toRegion = false;
      //this.destinationPath = [];

      // save current position
      let oldX = this.x;
      let oldY = this.y;
      let oldZ = this.z;
      let oldRot = this.rot;

      // calculate new position
      let newX = this.x - (playerInput.h * Config.PLAYER_SPEED);
      let newY = this.y;
      let newZ = this.z - (playerInput.v * Config.PLAYER_SPEED);
      let newRot = Math.atan2(playerInput.h, playerInput.v);

      // check if destination is in navmesh
      let sourcePos = new Vector3(oldX, oldY, oldZ); // new pos
      let destinationPos = new Vector3(newX, newY, newZ); // new pos
      const foundPath: any = this._navMesh.checkPath(sourcePos, destinationPos);
      if (foundPath){

          /*
          // adjust height of the entity according to the ground
          let currentRegion = this._navMesh.getClosestRegion( destinationPos );
          const distance = currentRegion.plane.distanceToPoint( sourcePos );
          let newY = distance * 0.2; // smooth transition
          */

          // next position validated, update player
          this.x = newX;
          this.y = newY;
          this.z = newZ;
          this.rot = newRot;
          this.sequence = playerInput.seq;
          //this.state = EntityCurrentState.WALKING;

          this.isMoving = true;

          // add player to server
          Logger.info('Valid position for '+this.name+': ( x: '+this.x+', y: '+this.y+', z: '+this.z+', rot: '+this.rot);

      } else {

          // collision detected, return player old position
          this.x = oldX;
          this.y = 0;
          this.z = oldZ;
          this.rot = oldRot;
          this.sequence = playerInput.seq;
          //this.state = EntityCurrentState.IDLE;

          Logger.warning('Invalid position for '+this.name+': ( x: '+this.x+', y: '+this.y+', z: '+this.z+', rot: '+this.rot);
      }
      
  }

  /**
   * Calculate rotation based on moving from v1 to v2
   * @param {Vector3} v1 
   * @param {Vector3} v2 
   * @returns rotation in radians
   */
  calculateRotation(v1:Vector3, v2:Vector3):number{
    return Math.atan2(v1.x - v2.x, v1.z - v2.z);
  }
  

  

}
