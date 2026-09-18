import { competitionRack, judgeShot, legalTargets, groupOf, lagResult, TABLES } from './match-rules.js';
import { chooseShot, lagPower } from './pool-ai.js';
import { RADIUS, shotSpeed, HALF_X, HALF_Z } from './physics.js';
import { FOOT_SPOT_X, HEAD_STRING_X } from './table-model.js';

export class PoolMatch {
  constructor(physics,scene,config,onChange=()=>{}){
    this.physics=physics;this.scene=scene;this.config=config;this.onChange=onChange;
    this.names=[config.name,config.opponent.name];this.score=[0,0];this.turn=0;this.groups=[null,null];this.fouls=[0,0];
    this.captured=[[],[]];this.phase='lag-ready';this.timer=null;this.disposed=false;this.rackNumber=1;this.message='Thi băng: bi trắng của bạn, bi vàng của máy. Đánh tới băng cuối rồi quay về gần băng đầu.';
    this.aiLagPower=lagPower(TABLES[config.table].friction,config.level);
    this.prepareLag();
  }
  get canHumanShoot(){return !this.disposed&&!this.foulNotice&&(this.phase==='lag-ready'||this.phase==='playing'&&this.turn===0)&&!this.physics.moving;}
  get targets(){return legalTargets(this.config.game,this.groups[this.turn],this.physics.balls.filter(b=>b.id&&!b.pocketed).map(b=>b.id),this.breaking);}
  notify(){if(this.disposed)return;this.onChange(this);this.scheduleAI();}
  prepareLag(){
    const p=this.physics;p.reset('lag');p.autoRespot=false;p.rollingFriction=TABLES[this.config.table].friction;
    p.balls.forEach(b=>b.pocketed=b.id>1);
    for(let i=0;i<2;i++)Object.assign(p.balls[i],{x:HEAD_STRING_X-.1,px:HEAD_STRING_X-.1,z:i===0?-.8:.8,pz:i===0?-.8:.8});
    this.lagRecords=[{foot:0,bad:false},{foot:0,bad:false}];this.phase='lag-ready';this.scene.angle=0;this.scene.guideKey=null;this.scene.syncBalls(0);this.notify();
  }
  shootHuman(angle,power,call){
    if(!this.canHumanShoot)return false;this.pendingCall={...call,push:!!call?.push&&this.pushAvailable&&!this.breaking};return this.physics.shoot(angle,power);
  }
  event(e){
    if(this.disposed)return;
    if(this.phase==='lag-ready'&&e.type==='shot'){
      this.phase='lag-running';const ball=this.physics.balls[1];ball.vx=shotSpeed(this.aiLagPower);ball.vz=0;
      this.message='Hai bi đang thi băng…';this.notify();return;
    }
    if(this.phase==='lag-running'){
      if(e.type==='contact')this.lagRecords.forEach(r=>r.bad=true);
      if(e.id===0||e.id===1){const r=this.lagRecords[e.id];
        if(e.type==='cushion'){if(e.inward[0]===-1)r.foot++;if(e.inward[1]||e.jaw)r.bad=true;}
        if(['pocket','off-table','center-cross'].includes(e.type))r.bad=true;
      }
      if(e.type==='settled'){
        const result=lagResult(this.physics.balls.slice(0,2),this.lagRecords);this.lagWinner=result.winner;
        this.phase=result.winner===null?'lag-retry':'lag-choice';this.message=result.winner===null?result.reason:`${this.names[result.winner]} thắng thi băng. ${result.reason}`;this.notify();
      }return;
    }
    if(this.phase!=='playing')return;
    if(e.type==='shot'){
      this.physics.breakPending=this.breaking;
      this.shot={first:null,pockets:[],off:[],rails:new Set(),railAfter:false,crossed:new Set(),crossedKitchen:false,
        remaining:this.physics.balls.filter(b=>b.id&&!b.pocketed).map(b=>b.id),
        startPositions:Object.fromEntries(this.physics.balls.map(b=>[b.id,{x:b.x,z:b.z}])),
        kitchen:this.physics.hand==='kitchen',call:this.pendingCall||null,safety:!!this.pendingCall?.safety,push:!!this.pendingCall?.push};
      this.physics.hand=null;this.message=`${this.names[this.turn]} đang đánh…`;this.notify();return;
    }
    const shot=this.shot;if(!shot)return;
    if(e.type==='contact'&&(e.a===0||e.b===0)&&shot.first===null){
      shot.first=e.a||e.b;
      shot.firstInKitchenWithoutCross=shot.kitchen&&!shot.crossedKitchen&&shot.startPositions[shot.first]?.x<HEAD_STRING_X;
    }
    if(e.type==='cushion'&&e.fresh!==false){if(e.id)shot.rails.add(e.id);if(shot.first!==null)shot.railAfter=true;}
    if(e.type==='pocket'){shot.pockets.push({id:e.id,pocketIndex:e.pocketIndex});if(e.id&&!this.captured[this.turn].includes(e.id))this.captured[this.turn].push(e.id);}
    if(e.type==='off-table')shot.off.push(e.id);
    if(e.type==='head-cross'){if(e.id)shot.crossed.add(e.id);else if(e.forward)shot.crossedKitchen=true;}
    if(e.type==='settled')this.finishShot();
  }
  finishShot(){
    const result=judgeShot({...this.config,turn:this.turn,groups:this.groups,fouls:this.fouls,breaking:this.breaking},this.shot);
    const shooter=this.turn;this.lastShot=this.shot;this.shot=null;this.pendingCall=null;
    if(result.foul){this.foulNotice=true;clearTimeout(this.noticeTimer);this.noticeTimer=setTimeout(()=>{this.foulNotice=false;this.noticeTimer=null;if(this.phase==='playing')this.message='Lượt '+this.names[this.turn]+(this.physics.hand?' · Được đặt bi cái.':'.');this.notify();},2000);}
    if(result.foul)this.fouls[shooter]++;else this.fouls[shooter]=0;
    for(const id of result.spot)this.spot(id);
    if(result.group){this.groups[shooter]=result.group;this.groups[1-shooter]=result.group==='solid'?'stripe':'solid';}
    this.pushAvailable=result.pushAvailable;this.breaking=false;
    if(result.winner!==null){this.winRack(result.winner,result.foul);return;}
    this.turn=result.next;
    this.message=result.foul?`Lỗi: ${result.foul}.`:`Lượt ${this.names[this.turn]}.`;
    if(result.choice){this.phase='choice';this.choice=result.choice;this.choiceShooter=shooter;this.choiceFoul=result.foul;}
    else if(result.hand)this.giveHand(result.hand);
    if(this.config.game==='9'&&this.fouls[this.turn]===2)this.message+=' Cảnh báo: đã phạm 2 lỗi liên tiếp, thêm 1 lỗi sẽ thua ván.';
    this.aimNextTarget();this.scene.guideKey=null;this.scene.syncBalls(0);this.notify();
  }
  aimNextTarget(){
    if(this.config.game!=='9'||this.physics.moving)return;
    const target=this.physics.balls.find(b=>b.id===this.targets[0]&&!b.pocketed),cue=this.physics.cueBall;
    if(target){this.scene.angle=Math.atan2(target.z-cue.z,target.x-cue.x);this.scene.guideKey=null;}
  }
  startRack(breaker){
    clearTimeout(this.noticeTimer);this.foulNotice=false;this.captured=[[],[]];
    this.firstBreaker??=breaker;this.breaker=breaker;this.turn=breaker;this.groups=[null,null];this.fouls=[0,0];this.pushAvailable=false;this.breaking=true;
    const p=this.physics;p.reset('match');p.balls=competitionRack(this.config);p.autoRespot=false;p.rollingFriction=TABLES[this.config.table].friction;p.hand='kitchen';
    this.phase='playing';this.choice=null;this.shot=null;this.pendingCall=null;this.scene.angle=0;this.scene.guideKey=null;this.scene.syncBalls(0);
    this.message=`Ván ${this.rackNumber}: ${this.names[breaker]} phá bi. Đặt bi cái phía sau vạch bếp.`;this.notify();
  }
  giveHand(zone){
    const p=this.physics;p.hand=zone;
    if(p.cueBall.pocketed)p.respotCue();
    if(!p.placeCue(p.cueBall.z,p.cueBall.x)){
      search:for(let x=-HALF_X+RADIUS+.01;x<HALF_X-RADIUS;x+=RADIUS*2.1)for(let z=0;z<HALF_Z-RADIUS;z+=RADIUS*2.1)if(p.placeCue(z,x))break search;
    }
    this.message+=zone==='kitchen'?' Được đặt bi cái phía sau vạch bếp.':' Được đặt bi cái trên bàn.';
    if(zone==='kitchen'&&!this.breaking){
      const targets=this.physics.balls.filter(b=>this.targets.includes(b.id));
      if(targets.length&&targets.every(b=>b.x<HEAD_STRING_X))this.spot(targets.sort((a,b)=>b.x-a.x)[0].id);
    }
  }
  spot(id){
    this.captured=this.captured.map(ids=>ids.filter(value=>value!==id));
    const p=this.physics,b=p.balls.find(b=>b.id===id);if(!b)return;
    const free=x=>p.balls.every(o=>o.id===id||o.pocketed||Math.hypot(o.x-x,o.z)>=2*RADIUS+.0005);
    const positions=[FOOT_SPOT_X];for(let x=FOOT_SPOT_X+.002;x<HALF_X-RADIUS;x+=.002)positions.push(x);for(let x=FOOT_SPOT_X-.002;x>-HALF_X+RADIUS;x-=.002)positions.push(x);
    const x=positions.find(free);if(x===undefined)return;
    Object.assign(b,{x,px:x,z:0,pz:0,y:RADIUS,py:RADIUS,vx:0,vz:0,wx:0,wz:0,pocketed:false,falling:false});
  }
  choose(action){
    if(this.phase==='lag-retry'){this.message='Thi lại để phân định quyền phá.';this.prepareLag();return;}
    if(this.phase==='lag-choice'){this.startRack(action==='give'?1-this.lagWinner:this.lagWinner);return;}
    if(this.phase==='rack-over'){this.rackNumber++;this.startRack((this.firstBreaker+this.rackNumber-1)%2);return;}
    if(this.phase!=='choice'||this.foulNotice)return;
    const choice=this.choice;
    if(action==='rerack-self'){this.startRack(this.turn);return;}
    if(action==='rerack-other'){this.startRack(this.choiceShooter);return;}
    if(action==='return')this.turn=this.choiceShooter;
    this.phase='playing';this.choice=null;
    this.message=`Lượt ${this.names[this.turn]}.`;
    if(action==='hand'||choice==='eight-foul'||this.physics.cueBall.pocketed)this.giveHand('kitchen');
    // An accepted illegal 9-ball break has no push-out opportunity.
    this.pushAvailable=choice==='illegal-nine'&&action==='return';
    this.aimNextTarget();this.notify();
  }
  winRack(winner,reason){
    this.score[winner]++;this.phase=this.score[winner]>=this.config.target?'match-over':'rack-over';
    this.message=`${this.names[winner]} thắng ${this.phase==='match-over'?'trận':'ván'}.`+(reason?` ${reason}.`:'');this.notify();
  }
  scheduleAI(){
    if(this.disposed||this.foulNotice||this.timer||this.physics.moving)return;
    const decision=this.phase==='lag-choice'?this.lagWinner===1:this.phase==='choice'?this.turn===1:this.phase==='playing'&&this.turn===1;
    if(!decision)return;
    this.timer=setTimeout(()=>{
      this.timer=null;if(this.disposed)return;
      if(this.phase==='lag-choice'){this.choose('take');return;}
      if(this.phase==='choice'){this.choose(this.choice==='break-foul'?'hand':this.choice==='illegal-eight'?'rerack-self':'accept');return;}
      if(this.phase!=='playing'||this.turn!==1||this.physics.moving)return;
      if(this.physics.hand){
        // Try legal cue placements; score direct targets with the same planner.
        let best=null;
        for(const x of this.physics.hand==='kitchen'?[-2.4,-3.2]:[-3,-1,1,3])for(const z of [-1.4,-.6,.6,1.4]){
          if(!this.physics.placeCue(z,x))continue;const shot=chooseShot(this.physics,this,()=>.5);
          if(shot&&(!best||(shot.score??99)<best.score))best={x:this.physics.cueBall.x,z:this.physics.cueBall.z,score:shot.score??99};
        }
        if(best)this.physics.placeCue(best.z,best.x);
      }
      const shot=chooseShot(this.physics,this);if(!shot)return;
      this.pendingCall=shot;this.scene.angle=shot.angle;this.scene.power=shot.power;this.scene.guideKey=null;
      this.message=`${this.names[1]} ngắm bi ${shot.ball}${!this.breaking&&this.config.game==='8'?`, lỗ ${shot.pocket+1}`:''}…`;this.onChange(this);
      this.timer=setTimeout(()=>{this.timer=null;if(this.disposed)return;this.scene.strike(shot.power,()=>{if(!this.disposed)this.physics.shoot(shot.angle,shot.power);});this.scene.power=0;},600);
    },750);
  }
  dispose(){this.disposed=true;clearTimeout(this.noticeTimer);clearTimeout(this.timer);this.timer=null;this.scene.striking=null;this.scene.power=0;}
}
