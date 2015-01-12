/** Some logic inspired from Dennis Hotson's Springy.js **/
Vector = function(x, y) {
    this.x = x;
    this.y = y;
};
Vector.prototype = {
    add: function(v2) {
      return new Vector(this.x + v2.x, this.y + v2.y);
    },
    subtract: function(v2) {
     return new Vector(this.x - v2.x, this.y - v2.y);
    },
    multiply: function(n) {
    return new Vector(this.x * n, this.y * n);
    },
    divide: function(n) {
    return new Vector((this.x / n) || 0, (this.y / n) || 0); // Avoid divide by zero errors..
    },
    magnitude: function() {
    return Math.sqrt(this.x*this.x + this.y*this.y);
    },
    normal: function() {
    return new Vector(-this.y, this.x);
    },
    normalise: function() {
    return this.divide(this.magnitude());
    }
}
Charge = function(position, mass) {
    this.p = position; // position
    this.m = mass; // mass
    this.v = new Vector(0, 0); // velocity
    this.a = new Vector(0, 0); // acceleration
    this.onTopOf = 0; //using this to handle charges on top of charges
};
Charge.prototype = {
    applyForce: function(force) {
    this.a = this.a.add(force.divide(this.m));
    }
}
function createChargedParticles() {
   var i=0;
   for(i=0; i<points.length; i++) {
      chargedParticles.bubbles.push(new Charge(new Vector(points[i].x, points[i].y), 1));
      //Imagine the charge at the center of bubble label box
      chargedParticles.labels.push(new Charge(new Vector(labels[i].x + LABEL_W / 2, labels[i].y + LABEL_H / 2), 1));
   }
}
function tagLabelOnLabels() {
    var k=0,
        l=0;
    for(k=0; k<chargedParticles.labels.length; k++) {
        chargedParticles.labels[k].onTopOf = 0;
    }
    for(k=0; k<chargedParticles.labels.length; k++) {
          for(l=0; l<chargedParticles.labels.length; l++) {
              if(k===l) continue;
              if(chargedParticles.labels[l].p.x === chargedParticles.labels[k].p.x &&
                  chargedParticles.labels[l].p.y === chargedParticles.labels[k].p.y) {
                  if(chargedParticles.labels[k].onTopOf===0) chargedParticles.labels[k].onTopOf = 1;
                  if( chargedParticles.labels[l].onTopOf !== 0) chargedParticles.labels[k].onTopOf = chargedParticles.labels[l].onTopOf + 1;
              }
          }
    }
}
function applyColumbsLaw(chargedParticlesArray) {
    var k=0,
        i=0,
        j=0;
    for(k=0; k<badLabelIndexes.length; k++) {
        i = badLabelIndexes[k];
        for(j=0; j<chargedParticlesArray.length; j++){
            if (i !== j) {
                var p1 = chargedParticles.labels[i];
                var p2 = chargedParticlesArray[j];
                var d = p1.p.subtract(p2.p);
                var distance = d.magnitude() + 0.1; // avoid massive forces at small distances (and divide by zero)
                var direction = d.normalise();
                var da = new Charge(new Vector(0,0), 1);
                // apply force to each end point
                p1.applyForce(direction.multiply(REPULSION).divide(distance * distance * 0.5));
                p2.applyForce(direction.multiply(REPULSION).divide(distance * distance * -0.5));
                da.applyForce(direction.multiply(REPULSION).divide(distance * distance * 0.5));
                totalDebugData[i] =  totalDebugData[i] + "<br>F_from "+j+" a.x: "+ da.a.x.toFixed(2)+", a.y: "+da.a.y.toFixed(2);
            }
        }
    }
}
/**
 * This method will go through each label and apply columbs law with boundaries
 * Imagine a charge on boundary lines at same x or y as the label and apply columbs law
 */
function applyBoundaryColumbsLaw() {
  var k= 0,
      i=0,
      j= 0,
      boundaryCharges = [];
  for(k=0; k<badLabelIndexes.length; k++) {
      i = badLabelIndexes[k];
      boundaryCharges = getBoundaryCharges(i);
      for(j=0;j<boundaryCharges.length;j++) {
          var p1 = chargedParticles.labels[i];
          var p2 = boundaryCharges[j];
          var d = p1.p.subtract(p2.p);
          var distance = d.magnitude() + 0.1; // avoid massive forces at small distances (and divide by zero)
          var direction = d.normalise();
          var da = new Charge(new Vector(0,0), 1);
          // apply force to each end point
          p1.applyForce(direction.multiply(REPULSION).divide(distance * distance * 0.5));
          da.applyForce(direction.multiply(REPULSION).divide(distance * distance * 0.5));
          totalDebugData[i] =  totalDebugData[i] + "<br>BF_from "+getBoundaryLabel(j)+" a.x: "+da.a.x.toFixed(2)+", a.y: "+da.a.y.toFixed(2);
      }
  }
}
function applyAttractionForce() {
   var l,
       b,
       d,
       distance,
       direction,
       da
       i=0,
       k=0;
   for(k=0; k<badLabelIndexes.length; k++) {
       i = badLabelIndexes[k];
       l = chargedParticles.labels[i];
       b = chargedParticles.bubbles[i];
       d = l.p.subtract(b.p.add({x: LABEL_W / 2, y: LABEL_H / 2}));
       da = new Charge(new Vector(0,0), 1);
       distance = d.magnitude() + 0.1;
       direction = d.normalise();
       if(distance > 3 * BUBBLE_R) { //only apply attraction if it is far by a factor
           l.applyForce(direction.multiply(ATTRACTION * -1 * distance))
           da.applyForce(direction.multiply(ATTRACTION * -1 * distance));
           totalDebugData[i] =  totalDebugData[i] + "<br>Attraction a.x: "+da.a.x.toFixed(2)+", a.y: "+da.a.y.toFixed(2);
       }
   }
}
function getBoundaryLabel(index) {
    if(index === 0) return "left";
    if(index === 1) return "right";
    if(index === 2) return "top";
    if(index === 3) return "bottom";
}
/**
 * This method will take a label index, go to that label's bubble
 * and figure out the quadrant boundaries and create charges and return the array
 * @param labelIndex
 * @returns {Array}
 */
function getBoundaryCharges(labelIndex) {
   var rtnBoundaryCharges = [];
   //TODO: need to write code for each quadrant
   rtnBoundaryCharges.push(new Charge(new Vector(0, chargedParticles.labels[labelIndex].p.y), 1)); //left
   rtnBoundaryCharges.push(new Charge(new Vector(cW, chargedParticles.labels[labelIndex].p.y), 1)); //right
   rtnBoundaryCharges.push(new Charge(new Vector(chargedParticles.labels[labelIndex].p.x, 0), 1)); //top
   rtnBoundaryCharges.push(new Charge(new Vector(chargedParticles.labels[labelIndex].p.x, cH), 1)); //bottom

   return rtnBoundaryCharges;
}
function updateVelocities() {
    var k= 0,
        i= 0,
        v,
        a,
        cp;
    for(k=0; k<badLabelIndexes.length; k++) {
        i = badLabelIndexes[k];
        cp = chargedParticles.labels[i];
        cp.v = cp.v.add(cp.a.multiply(MIN_DISPLACEMENT)).multiply(DAMPING);
        cp.a = cp.a.multiply(0);
    }
}
function updatePositions() {
    var k= 0,
        i= 0,
        p,
        v,
        boundaryCharges,
        cp;
    for(k=0; k<badLabelIndexes.length; k++) {
        i = badLabelIndexes[k];
        cp = chargedParticles.labels[i];
        cp.p = cp.p.add(cp.v.multiply(MIN_DISPLACEMENT*Math.max(cp.onTopOf*10, 1)));
        //Here send the bubble index and get the boundary bubble coordinates
        boundaryCharges = getBoundaryCharges(i);
        if(boundaryCharges[0].p.x < cp.p.x - LABEL_W / 2 && boundaryCharges[1].p.x > cp.p.x + LABEL_W / 2) //left and right
          labels[i].x = cp.p.x - LABEL_W / 2;
        if(boundaryCharges[2].p.y < cp.p.y - LABEL_H / 2 && boundaryCharges[3].p.y > cp.p.y + LABEL_H / 2) //top and bottom
          labels[i].y = cp.p.y - LABEL_H / 2;
    }
}
function detectLabelToLabelCollisions() {
    var i = 0,
        j = 0,
        l1,
        l2,
        horizontalCollision = false,
        verticalCollision   = false,
        lblOverlap="[";
    badLabelIndexes = [];
    llCollisions = 0;
    for (i = 0; i < labels.length; i++) {
        l1 = labels[i];
        for(j = 0; j < labels.length; j++) {
            if(i === j) continue;
            horizontalCollision = false;
            verticalCollision = false;
            l2 = labels[j];
            if ((l1.x <= l2.x && l2.x <= l1.x + LABEL_W)||
                (l1.x <= l2.x + LABEL_W && l2.x + LABEL_W <= l1.x + LABEL_W)) horizontalCollision = true;
            if ((l1.y <= l2.y && l2.y <= l1.y + LABEL_H)||
                (l1.y <= l2.y + LABEL_H && l2.y + LABEL_H < l1.y + LABEL_H)) verticalCollision = true;
            if (horizontalCollision && verticalCollision) {
                llCollisions++;
                lblOverlap = lblOverlap + i + "-" + j + "|";
                addToBadLabelIndexes(i);
            }
        }
    }
    document.getElementById("llCollisions").innerHTML = "l-l Collisions: "+llCollisions+lblOverlap+"]";
}
function addToBadLabelIndexes(index) {
    var k=0;
    for(k=0; k < badLabelIndexes.length; k++) {
        if(badLabelIndexes[k] === index) return;
    }
    badLabelIndexes.push(index);
}
function detectLabelTOBubbleCollisions() {
   var i = 0,
       j = 0,
       l,
       p,
       inRectangle = false,
       intersectingOneHorizontalLine = false,
       intersectingOneVerticalLine = false,
       lblOverlap = "[";
   lbCollisions = 0;
   for (i = 0; i < labels.length; i++) {
       l = labels[i];

       for (j = 0; j < points.length; j++) {
          p = points[j];
          inRectangle = false;
          intersectingOneHorizontalLine = false;
          intersectingOneVerticalLine = false;
          if (l.x < p.x && l.x + LABEL_W > p.x
           && l.y < p.y && l.y + LABEL_H > p.y)  inRectangle = true;

           if ((l.x <= p.x && l.x + LABEL_W >= p.x)
           && ((l.y < p.y + BUBBLE_R && l.y > p.y)||
                (l.y + LABEL_H < p.y - BUBBLE_R && l.y + LABEL_H > p.y))) intersectingOneHorizontalLine = true;

           if (((l.x + LABEL_W < p.x - BUBBLE_R && l.x + LABEL_W > p.x) ||
               (l.x < p.x + BUBBLE_R && l.x > p.x))
            && (l.y <= p.y && l.y + LABEL_H >= p.y)) intersectingOneVerticalLine = true;

           if (inRectangle || intersectingOneHorizontalLine || intersectingOneVerticalLine) {
               lbCollisions++;
               lblOverlap = lblOverlap + i + "-" + j + "|";
               addToBadLabelIndexes(i);
           }
       }
   }
   document.getElementById("lbCollisions").innerHTML = "l-b Collisions: "+lbCollisions+lblOverlap+"]";
}
