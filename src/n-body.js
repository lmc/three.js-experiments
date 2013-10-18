(function() {
  var _run,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  _run = (function() {
    var BODIES_COUNT, Body, bodies, bounds, camera, create_bodies, distance_between, distance_between_bodies, distance_epsilon, do_render, do_sim_tick, do_think, epsilon, epsilon_limit, frame_count, g, get_radius_for_mass, gravity_force, light, make_sphere, merge_bodies, origin, renderer, scene, stats_el, tick_count,
      _this = this;
    g = 0.0005;
    BODIES_COUNT = 50;
    bounds = 10;
    distance_epsilon = 0.1;
    bodies = [];
    origin = new THREE.Vector3(0.0, 0.0, 0.0);
    frame_count = 0;
    tick_count = 0;
    get_radius_for_mass = function(mass) {
      return Math.pow(3 * mass / Math.PI * 4, 1 / 3) / 5;
    };
    make_sphere = function(radius, options) {
      var geometry, material;
      geometry = new THREE.SphereGeometry(radius, 10, 10);
      material = new THREE.MeshPhongMaterial(options);
      return new THREE.Mesh(geometry, material);
    };
    Body = (function() {

      function Body(mass) {
        this.mass = mass;
        this.tick = __bind(this.tick, this);

        this.on_collide = __bind(this.on_collide, this);

        this.mesh_options = __bind(this.mesh_options, this);

        this.init_into_scene = __bind(this.init_into_scene, this);

        this.set_pos = __bind(this.set_pos, this);

        this.pos = new THREE.Vector2(0, 0);
        this.w_pos = new THREE.Vector2(0, 0);
        this.radius = get_radius_for_mass(this.mass);
        this.velocity = new THREE.Vector2(0, 0);
        this.collided_with = null;
        this.mesh = make_sphere(this.radius, this.mesh_options());
      }

      Body.prototype.set_pos = function(x, y) {
        this.pos.x = this.w_pos.x = x;
        return this.pos.y = this.w_pos.y = y;
      };

      Body.prototype.init_into_scene = function(scene) {
        return scene.add(this.mesh);
      };

      Body.prototype.mesh_options = function() {
        return {
          color: 0x008888
        };
      };

      Body.prototype.on_collide = function(body, idx, my_idx) {
        if (!(this.collided_with || body.collided_with)) {
          this.collided_with = idx;
          return body.collided_with = my_idx;
        } else {
          if (this.mass > body.mass) {
            return body.velocity.set(0, 0);
          } else {
            return this.velocity.set(0, 0);
          }
        }
      };

      Body.prototype.tick = function(bodies, my_idx) {
        var angle_rads, angle_vec, body, distance, force, idx, to_apply, _i, _len;
        for (idx = _i = 0, _len = bodies.length; _i < _len; idx = ++_i) {
          body = bodies[idx];
          if (my_idx !== idx) {
            angle_rads = Math.atan2(body.pos.y - this.pos.y, body.pos.x - this.pos.x);
            angle_vec = new THREE.Vector2(Math.cos(angle_rads), Math.sin(angle_rads));
            distance = distance_between_bodies(body, this);
            if (distance < distance_epsilon) {
              distance = distance_epsilon;
            }
            if (distance < this.radius + body.radius) {
              this.on_collide(body, idx, my_idx);
            }
            force = gravity_force(body.mass, distance);
            to_apply = new THREE.Vector2(0, 0).copy(angle_vec).multiplyScalar(force);
            this.velocity.add(to_apply);
          }
        }
        return this.w_pos.add(this.velocity);
      };

      return Body;

    })();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    stats_el = document.getElementById('stats');
    light = new THREE.PointLight(0xFFFFFF);
    light.position.x = 0;
    light.position.y = 0;
    light.position.z = 0;
    scene.add(light);
    create_bodies = function(bounds, body_count) {
      var body, i, x, y, _i, _results;
      _results = [];
      for (i = _i = 0; 0 <= body_count ? _i < body_count : _i > body_count; i = 0 <= body_count ? ++_i : --_i) {
        body = new Body(0.1);
        body.init_into_scene(scene);
        x = -bounds + (Math.random() * bounds * 2);
        y = -bounds + (Math.random() * bounds * 2);
        body.set_pos(x, y);
        _results.push(bodies.push(body));
      }
      return _results;
    };
    create_bodies(bounds / 4, BODIES_COUNT / 4);
    create_bodies(bounds, BODIES_COUNT);
    create_bodies(bounds * 2, BODIES_COUNT);
    do_sim_tick = function() {
      var body, idx, merged, new_bodies, _i, _j, _len, _len1;
      for (idx = _i = 0, _len = bodies.length; _i < _len; idx = ++_i) {
        body = bodies[idx];
        body.tick(bodies, idx);
      }
      new_bodies = [];
      for (idx = _j = 0, _len1 = bodies.length; _j < _len1; idx = ++_j) {
        body = bodies[idx];
        if (typeof body.collided_with === "number") {
          body.mesh.position.x = body.mesh.position.y = -99999;
          if (idx < body.collided_with) {
            merged = merge_bodies(body, bodies[body.collided_with]);
            new_bodies.push(merged);
          }
        } else {
          new_bodies.push(body);
        }
      }
      return bodies = new_bodies;
    };
    epsilon = 0.01;
    epsilon_limit = function(val) {
      if (val === 0.0) {
        return val;
      } else if (val > 0.0 && val < epsilon) {
        return epsilon;
      } else if (val < 0.0 && val > -epsilon) {
        return -epsilon;
      } else {
        return val;
      }
    };
    distance_between_bodies = function(a, b) {
      return distance_between(a.pos.x, a.pos.y, b.pos.x, b.pos.y);
    };
    distance_between = function(x1, y1, x2, y2) {
      x1 = epsilon_limit(x1);
      x2 = epsilon_limit(x2);
      y1 = epsilon_limit(y1);
      y2 = epsilon_limit(y2);
      return Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
    };
    gravity_force = function(other_mass, distance) {
      return g * (other_mass / Math.pow(distance, 2));
    };
    merge_bodies = function(body1, body2) {
      var body1vel, body2vel, merged;
      merged = new Body(body1.mass + body2.mass);
      merged.init_into_scene(scene);
      body1vel = body1.velocity;
      body2vel = body2.velocity;
      if (body1.mass > body2.mass) {
        merged.pos = merged.w_pos = body1.pos;
        body2vel = body2vel.multiplyScalar((body2.mass / body1.mass) * 0.15);
      } else if (body1.mass < body2.mass) {
        merged.pos = merged.w_pos = body2.pos;
        body1vel = body1vel.multiplyScalar((body2.mass / body1.mass) * 0.15);
      } else {
        merged.pos = merged.w_pos = new THREE.Vector2((body1.pos.x + body2.pos.x) / 2, (body1.pos.y + body2.pos.y) / 2);
      }
      merged.velocity = new THREE.Vector2(0.0, 0.0).addVectors(body1vel, body2vel);
      return merged;
    };
    do_think = function() {
      var body, idx, mmb, _i, _len,
        _this = this;
      do_sim_tick();
      for (idx = _i = 0, _len = bodies.length; _i < _len; idx = ++_i) {
        body = bodies[idx];
        body.pos = body.w_pos;
        body.mesh.position.x = body.pos.x;
        body.mesh.position.z = body.pos.y;
      }
      mmb = bodies.sort(function(a, b) {
        if (a.mass > b.mass) {
          return -1;
        } else if (a.mass < b.mass) {
          return 1;
        } else {
          return 0;
        }
      })[0];
      mmb = {
        pos: {
          x: 0,
          y: 0
        }
      };
      origin.set(mmb.pos.x, 0.0, mmb.pos.y);
      camera.position.set(mmb.pos.x, 50.0, mmb.pos.y);
      camera.lookAt(origin);
      stats_el.innerHTML = "ticks: " + tick_count + ", frames: " + frame_count + ", bodies: " + bodies.length + ", mmb: " + mmb.mass;
      tick_count += 1;
      return setTimeout(do_think, 1000.0 / 60);
    };
    do_think();
    do_render = function() {
      requestAnimationFrame(do_render);
      renderer.render(scene, camera);
      return frame_count += 1;
    };
    return do_render();
  });

  window.addEventListener("load", _run);

}).call(this);
