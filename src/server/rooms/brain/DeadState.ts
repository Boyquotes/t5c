import { EntityState, AI_STATE } from "../../../shared/types";
import { State } from "../brain/StateManager";
import { BrainSchema } from "../schema";

class DeadState extends State {
    enter(owner: BrainSchema) {
        //console.log("[DeadState] ----------------------------------");
        owner.health = 0;
        owner.blocked = true;
        owner.anim_state = EntityState.DEAD;
        owner.ai_state = AI_STATE.IDLE;
        owner.isDead = true;
        owner.resetDestination();
    }

    execute(owner: BrainSchema) {
        console.log("[DeadState]");

        owner.DEAD_TIMER += 100;

        // delete so entity can be respawned
        if (owner.DEAD_TIMER > 5000) {
            // remove entity
            owner._state.spawnCTRL.removeEntity(owner);
        }
    }

    exit(owner: BrainSchema) {}
}

export default DeadState;
