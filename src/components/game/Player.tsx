import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useKeyboard } from "@/hooks/useKeyboard";
import { playerId, type NetState } from "@/hooks/useGameChannel";
import { Sumo, colorForId } from "../Sumo";
import { sfx } from "./sfx";
import { physicsSensors } from "./physicsSensors";
import { TEAMS, ball, fx, hitQueue, isRaceMode, match, net, teamOf, useMatch } from "./match";
import { advanceRace, CIRCUIT_HALF_WIDTH, circuitObstacles, circuitPoint, emptyRaceProgress, getCircuit, projectCircuit, type RaceProgress } from "./raceCircuit";
import { RaceVehicle, isVehicleMode } from "./RaceVehicle";
import { ACCEL, ARENA_R, BALL_R, FIELD_X, FIELD_Z, SOAP_ACCEL, SOAP_DRAG, DASH_COOLDOWN, DASH_PUSH, DASH_SPEED, DASH_TIME, DRAG, GRAVITY, MAX_SPEED, PLAYER_R, PUSH, RACE_ACCEL, RACE_DRAG, RACE_MAX_SPEED, STEER_RESPONSE, STOP_RESPONSE, MAX_TURN_RATE, SOAP_STEER_RESPONSE, SOCCER_MAX_SPEED, KICK_COOLDOWN, obstacleState, worldTime, spawnAngle } from "./constants";

export type LocalState = { dash:number;out:number;falls:number;dead:number;vx:number;vz:number;kick:number;tackle:number;race?:RaceProgress;raceSeq?:number;kickSeq?:number;x?:number;y?:number;z?:number;ry?:number;grabbed?:{from:string;x:number;z:number;active:boolean;at:number} };
const tmp=new THREE.Vector3(),camTarget=new THREE.Vector3(),renderPos=new THREE.Vector3(),camForward=new THREE.Vector3(),camRight=new THREE.Vector3();
export function Player(props:Parameters<typeof PlayerInner>[0]){return <PlayerInner {...props}/>}
function PlayerInner({playerRef,localRef,remote,onFall}:{playerRef:React.RefObject<THREE.Group|null>;localRef:React.RefObject<LocalState>;remote:React.RefObject<Map<string,NetState>>;onFall:()=>void}){
 const keys=useKeyboard(),{camera}=useThree(),a=spawnAngle(playerId),displayMatch=useMatch();const pos=useRef(new THREE.Vector3()),vel=useRef(new THREE.Vector3());const yaw=useRef(0),dashTimer=useRef(0),cooldown=useRef(0),tackleTimer=useRef(0),vy=useRef(0),hopY=useRef(0),hopV=useRef(0),spin=useRef(0),falling=useRef(false);const squash=useRef(1),squashV=useRef(0),tiltX=useRef(0),tiltZ=useRef(0),stuckTimer=useRef(0),simAccumulator=useRef(0);const hitCd=useRef(new Map<string,number>()),stunned=useRef(0),stepT=useRef(0),shake=useRef(0),kickFx=useRef(0),lastSeq=useRef(-1),lastSpace=useRef(false),lastShift=useRef(false),obsCd=useRef(new Map<number,number>());
 const charge=useRef(0),kickPower=useRef(0),tackleCooldown=useRef(0);
 const grabCooldown=useRef(0),grabTarget=useRef("");
 const respawn=(drop=5)=>{const race=isRaceMode(match.get().mode);if(match.get().mode==="lava"){const starts=[[-7,-5],[-2,-7],[4,-5],[7,0],[3,5],[-3,6],[-7,1],[0,0]];const s=starts[Math.floor(Math.random()*starts.length)]!;pos.current.set(s[0]+(Math.random()-.5)*.8,drop,s[1]+(Math.random()-.5)*.8);yaw.current=0}else if(race){const p=circuitPoint(getCircuit(match.get().mode),0);pos.current.set(p.x,drop,p.z);yaw.current=Math.atan2(p.tx,p.tz)}else{pos.current.set(Math.cos(a)*(ARENA_R-3.5),drop,Math.sin(a)*(ARENA_R-3.5));yaw.current=Math.atan2(-pos.current.x,-pos.current.z)}vel.current.set(0,0,0);hopY.current=drop;hopV.current=0;vy.current=0;falling.current=false;localRef.current.out=0;localRef.current.dead=0;sfx.pop()};
 const kick=(n:number)=>{squashV.current-=n};
 useFrame((state,rawDelta)=>{const frameDt=Math.min(rawDelta,.1),k=keys.current,group=playerRef.current;if(!group)return;const m=match.get(),soccer=m.mode==="futebol"&&m.phase!=="lobby"&&m.phase!=="vote",race=isRaceMode(m.mode)&&m.phase!=="lobby"&&m.phase!=="vote",vehicle=isVehicleMode(m.mode);
  if(m.seq!==lastSeq.current){lastSeq.current=m.seq;if(m.phase==="countdown"){vel.current.set(0,0,0);charge.current=0;kickFx.current=0;dashTimer.current=0;tackleTimer.current=0;const ids=[playerId,...remote.current.keys()].sort(),i=ids.indexOf(playerId);if(soccer){const team=teamOf(playerId,ids),mates=ids.filter(id=>teamOf(id,ids)===team);pos.current.set(team==="A"?-6:6,3,(mates.indexOf(playerId)-(mates.length-1)/2)*2.6);yaw.current=team==="A"?Math.PI/2:-Math.PI/2;hopY.current=3}else if(race){respawn(3);localRef.current.race=emptyRaceProgress();localRef.current.raceSeq=m.startedAt??0;const p=circuitPoint(getCircuit(m.mode),0),offset=(i%4-1.5)*2.8;pos.current.x=p.x+p.nx*offset-p.tx*Math.floor(i/4)*3;pos.current.z=p.z+p.nz*offset-p.tz*Math.floor(i/4)*3;hopY.current=3;renderPos.copy(pos.current);camera.position.set(pos.current.x-p.tx*13,10,pos.current.z-p.tz*13)}else respawn(4)}}
  cooldown.current=Math.max(0,cooldown.current-frameDt);tackleCooldown.current=Math.max(0,tackleCooldown.current-frameDt);dashTimer.current=Math.max(0,dashTimer.current-frameDt);tackleTimer.current=Math.max(0,tackleTimer.current-frameDt);stunned.current=Math.max(0,stunned.current-frameDt);kickFx.current=Math.max(0,kickFx.current-frameDt);grabCooldown.current=Math.max(0,grabCooldown.current-frameDt);localRef.current.dash=dashTimer.current>0?1:0;localRef.current.vx=vel.current.x;localRef.current.vz=vel.current.z;localRef.current.kick=kickFx.current>0?kickPower.current:0;localRef.current.tackle=tackleTimer.current>0?1:0;
  if(localRef.current.dead){group.visible=false;return}group.visible=true;
  const circuit=getCircuit(m.mode);
  const simulateStep = (dt:number) => {
   if(race && m.phase!=="countdown" && m.phase!=="fight") return;
   if(race && localRef.current.race?.finishedAt){vel.current.set(0,0,0);return;}
   if(!falling.current){while(hitQueue.length){const h=hitQueue.shift();if(!h)continue;vel.current.x+=h.x*h.power;vel.current.z+=h.z*h.power;hopV.current=h.dash?8:4;spin.current=(Math.random()-.5)*(h.dash?20:8);stunned.current=h.dash?.45:.2;kick(h.dash?10:6);fx.shake=Math.max(fx.shake,h.dash?.5:.2);sfx.boing(h.dash?1.2:.9)}
   const ix=(k.has("KeyD")||k.has("ArrowRight")?1:0)-(k.has("KeyA")||k.has("ArrowLeft")?1:0),iz=(k.has("KeyS")||k.has("ArrowDown")?1:0)-(k.has("KeyW")||k.has("ArrowUp")?1:0);
   net.input({ id: playerId, seq: Math.floor(performance.now()*20), moveX: ix, moveZ: iz, dash: dashTimer.current>0?1:0, tackle: tackleTimer.current>0?1:0, kick: kickFx.current>0?1:0, at: Date.now() });const grounded=hopY.current<=.001,control=m.phase==="countdown"?0:stunned.current>0?.15:grounded?1:.35;
   const throttle=vehicle?((k.has("KeyW")||k.has("ArrowUp")?1:0)-(k.has("KeyS")||k.has("ArrowDown")?1:0)):0;
   const hasInput=vehicle?(ix!==0||throttle!==0):(ix!==0||iz!==0);
   if(vehicle){
     if(m.phase!=="countdown"&&stunned.current===0){
       if(ix!==0){const speed=Math.min(1,vel.current.length()/RACE_MAX_SPEED);const steerRate=m.mode==="motos"?3.05:m.mode==="carros"?2.05:2.55;yaw.current+=ix*steerRate*(0.28+speed*0.85)*(throttle<0?-1:1)*dt}
       if(throttle!==0){tmp.set(Math.sin(yaw.current),0,Math.cos(yaw.current));vel.current.addScaledVector(tmp,throttle*RACE_ACCEL*(m.mode==="kart"?1.12:1)*control*dt)}
     }
     const fdX=Math.sin(yaw.current),fdZ=Math.cos(yaw.current),rdX=Math.cos(yaw.current),rdZ=-Math.sin(yaw.current);
     const longitudinal=vel.current.x*fdX+vel.current.z*fdZ,lateral=(vel.current.x*rdX+vel.current.z*rdZ)*Math.exp(-7*dt);
     vel.current.set(fdX*longitudinal+rdX*lateral,0,fdZ*longitudinal+rdZ*lateral);
     vel.current.multiplyScalar(Math.exp(-(throttle===0?RACE_DRAG:0.16)*dt));
     const vehicleMax=RACE_MAX_SPEED*(m.mode==="carros"?1.22:m.mode==="motos"?1.1:1);
     if(vel.current.length()>vehicleMax)vel.current.setLength(vehicleMax);
   }else if(hasInput&&m.phase!=="countdown"){
     if(race){camera.getWorldDirection(camForward);camForward.y=0;camForward.normalize();camRight.crossVectors(camForward,camera.up).normalize();tmp.copy(camForward).multiplyScalar(-iz).addScaledVector(camRight,ix).normalize()}else tmp.set(ix,0,iz).normalize();
     const acc=race?RACE_ACCEL:soccer?SOAP_ACCEL:ACCEL;
     const response=race?STEER_RESPONSE:soccer?SOAP_STEER_RESPONSE:STEER_RESPONSE;
     const targetX=tmp.x*(race?RACE_MAX_SPEED:soccer?SOCCER_MAX_SPEED:MAX_SPEED);
     const targetZ=tmp.z*(race?RACE_MAX_SPEED:soccer?SOCCER_MAX_SPEED:MAX_SPEED);
     const blend=1-Math.exp(-response*control*(soccer&&tackleTimer.current>0?.15:1)*dt);
     vel.current.x=THREE.MathUtils.lerp(vel.current.x,targetX,blend);
     vel.current.z=THREE.MathUtils.lerp(vel.current.z,targetZ,blend);
     vel.current.addScaledVector(tmp,acc*0.18*control*dt);
     if(stunned.current===0){
       const desiredYaw=Math.atan2(tmp.x,tmp.z);
       let turn=desiredYaw-yaw.current;
       while(turn>Math.PI)turn-=Math.PI*2;
       while(turn<-Math.PI)turn+=Math.PI*2;
       yaw.current+=THREE.MathUtils.clamp(turn,-MAX_TURN_RATE*dt,MAX_TURN_RATE*dt);
     }
     if(grounded){stepT.current+=dt;if(stepT.current>(race?.1:soccer?.13:.18)){stepT.current=0;sfx.step();hopV.current=race?1.4:soccer?0:2.2}}
   }else if(!hasInput&&m.phase!=="countdown"){
     if(vehicle)vel.current.multiplyScalar(Math.exp(-RACE_DRAG*dt));
     else {const stop=1-Math.exp(-(soccer?1.6:STOP_RESPONSE)*dt);vel.current.x=THREE.MathUtils.lerp(vel.current.x,0,stop);vel.current.z=THREE.MathUtils.lerp(vel.current.z,0,stop)}
   }
   const space=k.has("Space"),ps=space&&!lastSpace.current,released=!space&&lastSpace.current,shift=k.has("ShiftLeft")||k.has("ShiftRight"),pShift=shift&&!lastShift.current;lastSpace.current=space;lastShift.current=shift;
   if(m.phase==="fight"&&!stunned.current){
    if(soccer){
     if(space&&cooldown.current===0)charge.current=Math.min(1,charge.current+dt/0.85);
     if(released&&cooldown.current===0){kickPower.current=Math.max(.2,charge.current);charge.current=0;kickFx.current=.28;localRef.current.kickSeq=(localRef.current.kickSeq??0)+1;localRef.current.kick=kickPower.current;cooldown.current=KICK_COOLDOWN;kick(5)}
     if(pShift&&tackleCooldown.current===0){tackleTimer.current=.48;dashTimer.current=.48;tackleCooldown.current=.7;vel.current.addScaledVector(tmp.set(Math.sin(yaw.current),0,Math.cos(yaw.current)),7);kick(8);sfx.whoosh()}
    }else if(ps&&cooldown.current===0){cooldown.current=race?.5:DASH_COOLDOWN;dashTimer.current=race?.3:DASH_TIME;tmp.set(Math.sin(yaw.current),0,Math.cos(yaw.current));vel.current.addScaledVector(tmp,race?5.5:DASH_SPEED);sfx.whoosh()}
   }else charge.current=0;
    if(!soccer&&pShift&&grounded&&m.phase!=="countdown"&&!stunned.current){hopV.current=race?10:9;kick(-7);sfx.boing(.7)}
   const grabbing=k.has("KeyE")&&m.mode==="sumo"&&m.phase==="fight";let nearest:NetState|undefined,nearestD=3.65;if(grabbing){for(const s of remote.current.values()){if(s.out||s.dead)continue;const d=Math.hypot(pos.current.x-s.x,pos.current.z-s.z);if(d<nearestD){nearest=s;nearestD=d}}}if(nearest){if(grabTarget.current!==nearest.id&&grabTarget.current)net.grab({to:grabTarget.current,from:playerId,x:pos.current.x,z:pos.current.z,active:false,at:Date.now()});grabTarget.current=nearest.id;if(grabCooldown.current===0){net.grab({to:nearest.id,from:playerId,x:pos.current.x,z:pos.current.z,active:true,at:Date.now()});grabCooldown.current=.12;const dx=pos.current.x-nearest.x,dz=pos.current.z-nearest.z,len=Math.hypot(dx,dz)||1;vel.current.x-=dx/len*1.4;vel.current.z-=dz/len*1.4;kick(2);sfx.smack()}}else if(grabTarget.current){net.grab({to:grabTarget.current,from:playerId,x:pos.current.x,z:pos.current.z,active:false,at:Date.now()});grabTarget.current=""}
   for(const [id,remaining] of hitCd.current){if(remaining-dt<=0)hitCd.current.delete(id);else hitCd.current.set(id,remaining-dt)}\n   for(const s of remote.current.values()){if(s.out||s.dead)continue;tmp.set(pos.current.x-s.x,0,pos.current.z-s.z);const d=tmp.length(),minD=PLAYER_R*2+.3;if(d<minD){const penetration=minD-d;if(d>.001)tmp.divideScalar(d);else tmp.set(playerId<s.id?-1:1,0,0);pos.current.addScaledVector(tmp,penetration*(stuckTimer.current>.12?.9:.55));stuckTimer.current=Math.min(.5,stuckTimer.current+dt);if(!hitCd.current.has(s.id)&&m.phase!=="countdown"){hitCd.current.set(s.id,.22);const closing=Math.max(0,-vel.current.dot(tmp)),dash=dashTimer.current>0||tackleTimer.current>0;net.hit({to:s.id,from:playerId,x:-tmp.x,z:-tmp.z,power:soccer?(dash?7:Math.min(3,closing*.4)):dash?DASH_PUSH*.9:Math.max(PUSH*.7,closing*1.8),dash:dash?1:0});vel.current.addScaledVector(tmp,dash?2.5:3.2);if(dash){dashTimer.current=0;tackleTimer.current=0;sfx.smack()}kick(4)}}}
   const held=localRef.current.grabbed;if(m.mode==="sumo"&&m.phase==="fight"&&held?.active&&performance.now()-held.at<300){const gx=held.x-pos.current.x,gz=held.z-pos.current.z,gd=Math.hypot(gx,gz);if(gd>1.15){const pull=gd>3?10:7;vel.current.x=THREE.MathUtils.lerp(vel.current.x,gx/(gd||1)*pull,1-Math.exp(-7*dt));vel.current.z=THREE.MathUtils.lerp(vel.current.z,gz/(gd||1)*pull,1-Math.exp(-7*dt));spin.current+=(Math.random()-.5)*.25;kick(1.2)}}else if(held?.active&&performance.now()-held.at>=300){localRef.current.grabbed={...held,active:false}}
   const damp=Math.exp(-(race?RACE_DRAG:soccer?SOAP_DRAG:DRAG)*dt);vel.current.multiplyScalar(dashTimer.current||tackleTimer.current?Math.exp(-.45*dt):damp);const cap=race?RACE_MAX_SPEED:dashTimer.current||tackleTimer.current?15:stunned.current?DASH_PUSH:soccer?SOCCER_MAX_SPEED:MAX_SPEED;if(vel.current.length()>cap)vel.current.setLength(cap);pos.current.addScaledVector(vel.current,dt);
   hopV.current+=GRAVITY*dt;hopY.current+=hopV.current*dt;
   if(m.mode==="lava"){
    const platforms=[[-7,-5,2.3,1.1],[-2,-7,2.8,1.35],[4,-5,2.4,1.6],[7,0,2.5,1.9],[3,5,2.7,2.2],[-3,6,2.5,2.55],[-7,1,2.1,2.9],[0,0,2.2,3.25]];
    let supported=false;
    for(const [px,pz,r,py] of platforms){if(Math.hypot(pos.current.x-px,pos.current.z-pz)<r-.15&&hopY.current<=py&&hopV.current<=0){hopY.current=py;hopV.current=0;supported=true;break}}
    const elapsed=Math.max(0,(performance.now()-(m.startedAt??performance.now()))/1000);
    const lavaLevel=-1.4+Math.min(5.1,elapsed*.045);
    if(hopY.current<lavaLevel&&!supported&&m.phase==="fight"){localRef.current.dead=1;localRef.current.falls++;onFall();sfx.scream();return}
   }
   if(hopY.current<=0&&m.mode!=="lava"){hopY.current=0;hopV.current=0}pos.current.y=hopY.current;
   if(soccer){const lx=FIELD_X-PLAYER_R,lz=FIELD_Z-PLAYER_R;if(Math.abs(pos.current.x)>lx){pos.current.x=Math.sign(pos.current.x)*lx;vel.current.x=0}if(Math.abs(pos.current.z)>lz){pos.current.z=Math.sign(pos.current.z)*lz;vel.current.z=0}}
   if(race){const projection=projectCircuit(circuit,pos.current.x,pos.current.z),limit=CIRCUIT_HALF_WIDTH-PLAYER_R;
     if(projection.distance>limit){const sign=Math.sign(projection.lateral)||1;pos.current.x=projection.x+projection.nx*sign*limit;pos.current.z=projection.z+projection.nz*sign*limit;const outward=vel.current.x*projection.nx*sign+vel.current.z*projection.nz*sign;if(outward>0){vel.current.x-=projection.nx*sign*outward*1.3;vel.current.z-=projection.nz*sign*outward*1.3}}
     for(const [i,c] of obsCd.current){if(c-dt<=0)obsCd.current.delete(i);else obsCd.current.set(i,c-dt)}
     const wt=worldTime(),px=pos.current.x,pz=pos.current.z;
     circuitObstacles(circuit).forEach((o,i)=>{if(Math.hypot(o.x-px,o.z-pz)>9)return;const st=obstacleState(o,wt),dx=px-st.x,dz=pz-st.z,d=Math.hypot(dx,dz)||.001,nx=d<.01?1:dx/d,nz=d<.01?0:dz/d,cd=obsCd.current.has(i);
      if(o.type==="soap"&&d<o.r+.3&&grounded){vel.current.x*=1+.9*dt;vel.current.z+=Math.sin(wt*7+i)*14*dt;spin.current+=(i%2?1:-1)*10*dt;if(!cd){obsCd.current.set(i,.6);sfx.slip()}}
      else if(o.type==="banana"&&d<o.r+PLAYER_R*.6&&grounded&&!cd){obsCd.current.set(i,1.2);vel.current.multiplyScalar(.35);spin.current=(Math.random()<.5?-1:1)*22;stunned.current=.7;hopV.current=6;kick(9);sfx.slip()}
      else if((o.type==="bumper"||o.type==="mover")&&d<o.r+PLAYER_R){pos.current.x=st.x+nx*(o.r+PLAYER_R);pos.current.z=st.z+nz*(o.r+PLAYER_R);const vn=vel.current.x*nx+vel.current.z*nz;if(vn<0){vel.current.x-=nx*vn*1.8;vel.current.z-=nz*vn*1.8}vel.current.x+=nx*8;vel.current.z+=nz*8;if(!cd){obsCd.current.set(i,.3);hopV.current=4;kick(7);sfx.boing(1)}}
      else if(o.type==="spinner"&&!cd){for(const s of [-1,1]){const ax=st.x+Math.cos(st.angle)*o.r*s,az=st.z-Math.sin(st.angle)*o.r*s,ex=px-ax,ez=pz-az,ed=Math.hypot(ex,ez)||.001;if(ed<.45+PLAYER_R){obsCd.current.set(i,.5);const tx2=-Math.sin(st.angle)*s,tz2=-Math.cos(st.angle)*s;vel.current.x+=ex/ed*10+tx2*8;vel.current.z+=ez/ed*10+tz2*8;hopV.current=7;spin.current=16;stunned.current=.45;kick(10);fx.shake=.35;sfx.smack();break}}}
      else if(o.type==="hammer"&&!cd&&d<o.r+PLAYER_R&&hopY.current<1.4){obsCd.current.set(i,.8);const dir=Math.cos(wt*1.7+o.x)>=0?1:-1;vel.current.x+=(o.nx??0)*dir*18;vel.current.z+=(o.nz??1)*dir*18;hopV.current=10;spin.current=20;stunned.current=.6;kick(12);fx.shake=.6;sfx.smack();sfx.scream()}
      else if(o.type==="ramp"&&d<o.r+.4&&grounded&&!cd){obsCd.current.set(i,1);hopV.current=13;vel.current.x+=Math.sin(o.heading??0)*9;vel.current.z+=Math.cos(o.heading??0)*9;kick(-8);sfx.whoosh()}});
     if(m.phase==="fight"){const prev=localRef.current.race??emptyRaceProgress(),next=advanceRace(prev,projectCircuit(circuit,pos.current.x,pos.current.z).fraction,Date.now());localRef.current.race=next;if(next.cp!==prev.cp||next.lap!==prev.lap)sfx.checkpoint()}}
   if(stuckTimer.current>0){stuckTimer.current=Math.max(0,stuckTimer.current-dt*.5)}
   if(!soccer&&!race){
    for(const [key,cd] of obsCd.current){if(key>=100){if(cd-dt<=0)obsCd.current.delete(key);else obsCd.current.set(key,cd-dt)}}
    const props=[[-4.1,-2.2,1.05],[3.8,-2.8,.95],[-2.4,4.1,.9],[4.7,2.1,1.1],[0,-5.2,.85],[-5.1,1.7,.8]] as const;
    for(let i=0;i<props.length;i++){const prop=props[i];if(!prop)continue;const [ox,oz,rr]=prop,dx=pos.current.x-ox,dz=pos.current.z-oz,d=Math.hypot(dx,dz)||.001,min=PLAYER_R+rr;if(d<min){const nx=d<.01?1:dx/d,nz=d<.01?0:dz/d;pos.current.x=ox+nx*(min+.03);pos.current.z=oz+nz*(min+.03);const vn=vel.current.x*nx+vel.current.z*nz;if(vn<0){vel.current.x-=nx*vn*1.85;vel.current.z-=nz*vn*1.85}vel.current.x+=nx*3.4;vel.current.z+=nz*3.4;const speed=Math.hypot(vel.current.x,vel.current.z);if(speed>3.2&&(obsCd.current.get(100+i)??0)<=0){obsCd.current.set(100+i,.72);hopV.current=4.5;spin.current+=(i%2?1:-1)*(speed>7?18:11);stunned.current=.22;kick(7);fx.shake=Math.max(fx.shake,.22);if(speed>7){vel.current.multiplyScalar(.62);sfx.slip()}else sfx.boing(.9)}}}
    if(m.mode!=="lava"&&physicsSensors.fall(pos.current.x,pos.current.z)){falling.current=true;localRef.current.out=1;vy.current=5;spin.current=(Math.random()-.5)*18;sfx.scream()}
   }
   const tx=THREE.MathUtils.clamp(vel.current.z*.05,-.5,.5),tz=THREE.MathUtils.clamp(-vel.current.x*.05,-.5,.5);tiltX.current+=(tx-tiltX.current)*(1-Math.exp(-10*dt));tiltZ.current+=(tz-tiltZ.current)*(1-Math.exp(-10*dt));spin.current*=Math.exp(-4*dt);yaw.current+=spin.current*dt;
  }else{vy.current+=GRAVITY*dt;pos.current.y+=vy.current*dt;pos.current.addScaledVector(vel.current,dt);if(pos.current.y<-13){localRef.current.falls++;onFall();if(match.get().phase==="fight"){localRef.current.dead=1;return}respawn()}}
  };
  simAccumulator.current = Math.min(simAccumulator.current + frameDt, 0.1);
  const fixedDt = 1 / 60;
  const steps = Math.min(5, Math.floor(simAccumulator.current / fixedDt));
  simAccumulator.current -= steps * fixedDt;
  for(let i=0;i<steps;i++) simulateStep(fixedDt);
  Object.assign(localRef.current,{x:pos.current.x,y:pos.current.y,z:pos.current.z,ry:yaw.current,vx:vel.current.x,vz:vel.current.z});
  const stiff=180;squashV.current+=(-(squash.current-1)*stiff-squashV.current*9)*frameDt;squash.current+=squashV.current*frameDt;const sy=THREE.MathUtils.clamp(squash.current+(dashTimer.current||tackleTimer.current?.2:0),.45,1.8),sxz=1/Math.sqrt(sy);const visualAlpha=1-Math.exp(-24*frameDt);renderPos.lerp(pos.current,visualAlpha);group.position.copy(renderPos);group.rotation.set(tiltX.current,yaw.current,tiltZ.current,"YXZ");group.scale.set(sxz,sy,sxz);if(soccer)camTarget.set(pos.current.x*.5,15,pos.current.z*.3+15);else if(race){const p=projectCircuit(circuit,pos.current.x,pos.current.z),heading=vehicle?yaw.current:Math.atan2(p.tx,p.tz);camTarget.set(pos.current.x-Math.sin(heading)*13,10,pos.current.z-Math.cos(heading)*13);}else camTarget.set(pos.current.x*.35,11,pos.current.z*.35+14.5);camera.position.lerp(camTarget,1-Math.exp(-3*frameDt));if(race){const p=projectCircuit(circuit,pos.current.x,pos.current.z),heading=vehicle?yaw.current:Math.atan2(p.tx,p.tz);camera.lookAt(pos.current.x+Math.sin(heading)*8,1.5,pos.current.z+Math.cos(heading)*8)}else camera.lookAt(pos.current.x*.3,1.4,pos.current.z*.3);if(fx.shake>.01){camera.position.x+=(Math.random()-.5)*fx.shake;camera.position.y+=(Math.random()-.5)*fx.shake;fx.shake*=Math.exp(-5*frameDt)}
 });
 return <group ref={playerRef}>{isVehicleMode(displayMatch.mode) ? <RaceVehicle mode={displayMatch.mode} color={colorForId(playerId)} seed={0}/> : <MyBlob/>}<mesh position={[0,.8,1]} rotation-x={-Math.PI/2} visible={false}><ringGeometry args={[.18,.42,20]}/><meshBasicMaterial color="#fff6a8" transparent opacity={.8}/></mesh></group>
}
function MyBlob(){const m=useMatch(),soccer=m.mode==="futebol";const color=soccer?TEAMS[teamOf(playerId,net.ids.length?net.ids:[playerId])].color:colorForId(playerId);return <Sumo key={color} color={color} seed={0}/>}
