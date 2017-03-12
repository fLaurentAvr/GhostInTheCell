/**
 * Created by FL2 on 11/03/2017.
 */
"use strict";
var __factories = [];


class Factory{

    constructor(id){
        this.id = id;
        this.prop = 0;
        this.cybs = 0;
        this.prod = 0;
        this.disabledStep = 0;
        this.arrivals = [];
        this.links = [];
        this.nextSteps = [this];
    }

    setInfos(prop,cybs,prod,disabledStep){
        this.prop = prop;
        this.cybs = cybs;
        this.prod = prod;
        this.disabledStep = disabledStep;
        this.arrivals = [];
        this.nextSteps = [this];
    }

    getLastStep(){
        if(this.nextSteps.length == 0){
            this.nextSteps = [this];
        }
        return this.nextSteps[this.nextSteps.length - 1];
    }

    getStep(steps){
        return steps < this.nextSteps.length
            ? this.nextSteps[steps]
            : this.getLastStep();
    }

    isAllCalc(){
        return this.getLastStep().arrivals.length === 0;
    }

    calculAllSteps(){
        while(!this.isAllCalc()){
            this.nextSteps.push(this.getLastStep().calculNextStep())
        }
    }

    calculNextStep(){
        var newStep = new Factory();
        newStep.id = this.id;
        newStep.prop = this.prop;
        newStep.cybs = this.cybs;
        newStep.prod = this.prod;
        newStep.links = this.links;

        // ---
        // Decrease disabled countdown
        // ---
        if(newStep.disabledStep > 0)
            newStep.disabledStep--;
        // ---
        // Execute orders
        // ---
        // TODO ^^
        // ---
        // Create new units
        // ---
        if(newStep.disabledStep === 0){
            newStep.cybs += newStep.prod;
        }

        var readyToFight = {
            '-1':0,
            '1':0
        };
        // ---
        // Calcul next step troops (auto add to nextStep arrivals if not arrived)
        // ---
        this.arrivals.forEach(t=>{
            var newTroopState = t.calculNextStep(newStep);
            if(newTroopState.isArrived){
                readyToFight[newTroopState.prop] += newTroopState.cybs;
            }
        });
        // ---
        // Solve battles
        // ---
        var minUnit = Math.min(readyToFight['1'],readyToFight['-1']);
        ['1','-1'].forEach(prop => {
            readyToFight[prop] -= minUnit;
            if(newStep.prop == prop){
                // Allied
                newStep.cybs += readyToFight[prop];
            }else{
                if(readyToFight[prop] > newStep.cybs){
                    newStep.prop = prop;
                    newStep.cybs = readyToFight[prop] - newStep.cybs;
                }else{
                    newStep.cybs -= readyToFight[prop];
                }
            }
        });

        // ---
        // Solve bombs
        // ---
        //TODO
        return newStep;
    }

    invalidStepAndRecalc(step){
        this.nextSteps = this.nextSteps.slice(0,step);
        this.calculAllSteps();
    }

    troopsAllStepSafe(){
        return Math.min(... this.nextSteps.map(s => Utils.isMe(s) ? s.cybs : -s.cybs));
    }

    addArrival(troop){
        this.arrivals.push(troop);
    }

    addLinks(link){
        this.links.push(link);
    }

    sortLinks(){
        this.links.sort(Utils.distSorter)
    }

    sortArrivals(){
        this.arrivals.sort(Utils.distSorter)
    }

    getLinkedEnemy(){
        var $this = this;
        return this.links.filter(l=>!Utils.isMe(l.getLinked($this)));
    }

    getLinkedTarget(){
        var $this = this;
        return this.links.filter(l=>{
                var target = l.getLinked($this);
                return !Utils.isMe(target) && target.cybs < $this.cybs;
            }
        );
    }

    getFactoriesNeedRenforcement(maxTroops){
        var $this = this,
            cntTroops = 0,
            needs = [];
        this.links.slice().sort(Utils.prodSorter).forEach( l => {
            var f = l.getLinked($this),
                s = f.getLastStep();
            if(!Utils.isMe(s) && maxTroops > s.cybs){
                needs.push({ target :f, cybs:s.cybs+1,dist:l.dist});
                maxTroops -= s.cybs+1;
            }
        });
        return needs;
    }


    static getFactory(id,link=null){
        var fact = __factories.find(f=>f.id==id);
        if(!fact){
            __factories.push(fact = new Factory(id));
            if(!link){
                printErr("Impossible de trouver l'id : " + id);
            }
        }
        if(link){
            fact.addLinks(link);
        }
        return fact;
    }
    static getFactories(){
        return __factories;
    }

    static getMyFactories(){
        return __factories.filter(Utils.isMe);
    }
}



class Link{
    constructor(factId1, factId2, dist){
        this.factories = {};
        this.factories[factId2] = Factory.getFactory(factId1,this);
        this.factories[factId1] = Factory.getFactory(factId2,this);
        this.dist = dist;
    }
    getLinked(fact){
        return this.factories[fact.id];
    }
}
var Utils = {
    distSorter: (a,b) => a.dist - b.dist,
    prodSorter: (a,b)=> b.prod - a.prod,
    is: (a,b) => a.prop == b,
    isEnemy: a => Utils.is(a,-1),
    isMe: a => Utils.is(a,1),
    cybsSorter:(a,b) => b.cybs - a.cybs
};

class Troop{
    constructor(prop, startFactory, targetFactory, cybs, dist){
        this.dist = dist;
        this.cybs = cybs;
        this.prop = prop;
        this.startFactory = startFactory;
        this.targetFactory = targetFactory;
        if(!(this.isArrived = this.dist === 0))
            this.targetFactory.addArrival(this);
    }
    calculNextStep(nextFactoryStep){
        return new Troop(
            this.prop,
            this.startFactory,
            nextFactoryStep,
            this.cybs,
            this.dist - 1);
    }
}

class Bomb{
    constructor(prop,sourceId,targetId,dist){

    }
}

class GameEngine{
    constructor(){
        this.bombCount = 2;
    }
    readInit(){
        var factoryCount = parseInt(readline()); // the number of factories
        var linkCount = parseInt(readline()); // the number of links between factories
        for (var i = 0; i < linkCount; i++) {
            var inputs = readline().split(' ');
            var factory1 = parseInt(inputs[0]);
            var factory2 = parseInt(inputs[1]);
            var distance = parseInt(inputs[2]);
            new Link(factory1,factory2,distance);
        }
        Factory
            .getFactories()
            .forEach(
                f=>f.sortLinks()
            );
    }

    readStep(){
        var entityCount = parseInt(readline()); // the number of entities (e.g. factories and troops)
        var bombs = [];
        for (var i = 0; i < entityCount; i++) {
            var inputs = readline().split(' ');
            var entityId = parseInt(inputs[0]);
            var entityType = inputs[1];
            var arg1 = parseInt(inputs[2]);
            var arg2 = parseInt(inputs[3]);
            var arg3 = parseInt(inputs[4]);
            var arg4 = parseInt(inputs[5]);
            var arg5 = parseInt(inputs[6]);
            switch(entityType){
                case "FACTORY" :
                    Factory.getFactory(entityId).setInfos(arg1,arg2,arg3);
                    break;
                case "TROOP":
                    new Troop(arg1, Factory.getFactory(arg2),Factory.getFactory(arg3),arg4,arg5);
                    break;
            }
        }
    }

    writeActions(){
        if(this.actions.length > 0){
            print(this.actions.join(';'));
        }else{
            print('WAIT');
        }
    }

    PlayStep(){
        var $this = this;
        this.actions = [];
        this.readStep();
        Factory
            .getFactories()
            .forEach(
                f => f.calculAllSteps()
            );

        //get "safe" factories
        Factory.getFactories()
            .filter(
                f => Utils.isMe(f) && Utils.isMe(f.getLastStep())
            ).forEach(
                f => {
                    var safeTroops = f.troopsAllStepSafe();
                    if(safeTroops > 0){
                        //there is some usable troops
                        f.getFactoriesNeedRenforcement(safeTroops)
                            .forEach(m =>
                                $this.addMove(f,m.target,m.cybs,m.dist)
                            )

                    }
                }
            )
        ;

        this.writeActions();
    }
    addMove(source,target,cybs,dist){
        this.actions.push(["MOVE",source.id, target.id,cybs].join(' '));
        source.cybs -= cybs;
        //TODO : recalc source and target steps ;)
        new Troop('1',source,target,cybs,dist);
        target.invalidStepAndRecalc(dist);
    }
    addBomb(source, target){
        this.actions.push(["BOMB",source.id, target.id].join(' '));
    }

    PlayAll(){
        while(true){
            this.PlayStep();
        }
    }



}

var gameEngine = new GameEngine();
gameEngine.readInit();
gameEngine.PlayAll();

/**
 * Auto-generated code below aims at helping you parse
 * the standard input according to the problem statement.
 **/
//
// var factoryCount = parseInt(readline()); // the number of factories
// var linkCount = parseInt(readline()); // the number of links between factories
// for (var i = 0; i < linkCount; i++) {
//     var inputs = readline().split(' ');
//     var factory1 = parseInt(inputs[0]);
//     var factory2 = parseInt(inputs[1]);
//     var distance = parseInt(inputs[2]);
//     new Link(factory1,factory2,distance);
// }
// var bombCount = 2;
// // game loop
// while (true) {
//     var entityCount = parseInt(readline()); // the number of entities (e.g. factories and troops)
//     var bombs = [];
//     for (var i = 0; i < entityCount; i++) {
//         var inputs = readline().split(' ');
//         var entityId = parseInt(inputs[0]);
//         var entityType = inputs[1];
//         var arg1 = parseInt(inputs[2]);
//         var arg2 = parseInt(inputs[3]);
//         var arg3 = parseInt(inputs[4]);
//         var arg4 = parseInt(inputs[5]);
//         var arg5 = parseInt(inputs[6]);
//         switch(entityType){
//             case "FACTORY" :
//                 Factory.getFactory(entityId).setInfos(arg1,arg2,arg3);
//                 break;
//             case "TROOP":
//                 new Troop(arg1, Factory.getFactory(arg2),Factory.getFactory(arg3),arg4,arg5);
//                 break;
//         }
//     }
//
//     var actions = [];
//     var move = (source,target,cybs)=> {
//         actions.push(["MOVE",source.id, target.id,cybs].join(' '));
//         source.cybs -= cybs;
//     }
//     var bomb = (source, target) => {
//         actions.push(["BOMB",source.id, target.id].join(' '));
//     }
//
//     var myFacts = Factory.myFactories();
//     myFacts.sort(Utils.cybsSorter);
//
//     myFacts.forEach(fact => {
//         if(fact.cybs > 0){
//         var links = fact.getLinkedEnemy();
//         if(links.length){
//             links.forEach(link=>{
//                 var target = link.getLinked(fact);
//             //TODO Check if allready targeted !!!
//             if(target.cybs < fact.cybs)
//                 move(fact,target,target.cybs + 1);
//
//         });
//         }
//     }
// });
//     // Write an action using print()
//     // To debug: printErr('Debug messages...');
//     // Any valid action, such as "WAIT" or "MOVE source destination cyborgs"
//
//     print(('WAIT;' + actions.join(';')).replace(/;$/,''));
// }