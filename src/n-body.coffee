_run = ( ->

  # constants, put your fingers all over these
  g = 0.0005
  BODIES_COUNT = 50
  bounds = 10

  # but maybe leave these ones alone for now
  distance_epsilon = 0.1
  bodies = []
  origin = new THREE.Vector3(0.0,0.0,0.0)
  frame_count = 0
  tick_count = 0

  
  get_radius_for_mass = (mass) ->
    Math.pow( 3*mass / Math.PI*4 , 1/3 ) / 5

  make_sphere = (radius,options) ->
    geometry = new THREE.SphereGeometry(radius,10,10)
    material = new THREE.MeshPhongMaterial(options)
    new THREE.Mesh( geometry, material )

  class Body
    constructor: (@mass) ->
      @pos = new THREE.Vector2(0,0)
      @w_pos = new THREE.Vector2(0,0)
      @radius = get_radius_for_mass(@mass)
      @velocity = new THREE.Vector2(0,0)
      @collided_with = null
      @mesh = make_sphere(@radius,@mesh_options())

    set_pos: (x,y) =>
      @pos.x = @w_pos.x = x
      @pos.y = @w_pos.y = y

    init_into_scene: (scene) =>
      scene.add(@mesh)

    mesh_options: () =>
      { color: 0x008888 }

    on_collide: (body,idx,my_idx) =>
      # HACK: can only collide once per tick
      if !(@collided_with || body.collided_with)
        @collided_with = idx
        body.collided_with = my_idx
      else
        # HACK: unset velocity on smallest body so we don't fuck up others while waiting for merge
        if @mass > body.mass
          body.velocity.set(0,0)
        else
          @velocity.set(0,0)

    # simulation rules:
    # we cannot naively update positions mid-tick, so we update our position using @w_pos
    # once the full tick is finished all particles get @pos set to @w_pos avoiding errors
    tick: (bodies,my_idx) =>
      for body, idx in bodies
        # don't apply gravity to self  
        if my_idx != idx      
          # get angle vector pointing at other body
          angle_rads = Math.atan2( (body.pos.y - @pos.y), (body.pos.x - @pos.x) )
          angle_vec = new THREE.Vector2( Math.cos(angle_rads), Math.sin(angle_rads) )

          distance = distance_between_bodies(body,this)
          # avoid massive velocities from close encounters
          distance = distance_epsilon if distance < distance_epsilon

          @on_collide(body,idx,my_idx) if distance < @radius + body.radius

          force = gravity_force(body.mass,distance)

          to_apply = new THREE.Vector2(0,0).copy(angle_vec).multiplyScalar(force)
          @velocity.add( to_apply )

      @w_pos.add( @velocity )



  # three.js boilerplate
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera( 75, (window.innerWidth/window.innerHeight), 0.1, 1000 )
  renderer = new THREE.WebGLRenderer()

  renderer.setSize( window.innerWidth, window.innerHeight )
  document.body.appendChild( renderer.domElement )

  stats_el = document.getElementById('stats')

  light = new THREE.PointLight(0xFFFFFF);
  light.position.x = 0
  light.position.y = 0
  light.position.z = 0
  scene.add(light)

  create_bodies = (bounds,body_count) =>
    for i in [0...body_count]
      body = new Body(0.1)
      body.init_into_scene(scene)
      x = -bounds + (Math.random() * bounds * 2)
      y = -bounds + (Math.random() * bounds * 2)
      body.set_pos(x,y)
      bodies.push(body)

  create_bodies(bounds/4,BODIES_COUNT/4)
  create_bodies(bounds,BODIES_COUNT)
  create_bodies(bounds * 2,BODIES_COUNT)

  do_sim_tick = ->
    for body, idx in bodies
      body.tick(bodies,idx)

    new_bodies = []
    for body, idx in bodies
      if typeof(body.collided_with) == "number"
        # meshes are instanced so we can't remove them from the scene (will remove all spheres)
        # instead send them on a trip to belize
        body.mesh.position.x = body.mesh.position.y = -99999
        # only merge each pair of bodies once
        if idx < body.collided_with
          merged = merge_bodies(body,bodies[body.collided_with])
          new_bodies.push(merged)
      else
        new_bodies.push(body)
    bodies = new_bodies
          


  # useful functions
  epsilon = 0.01
  epsilon_limit = (val) ->
    if val == 0.0
      val
    else if val > 0.0 && val < epsilon
      epsilon
    else if val < 0.0 && val > -epsilon
      -epsilon
    else
      val

  distance_between_bodies = (a,b) ->
    distance_between(a.pos.x,a.pos.y, b.pos.x,b.pos.y)

  distance_between = (x1,y1,x2,y2) ->
    x1 = epsilon_limit(x1)
    x2 = epsilon_limit(x2)
    y1 = epsilon_limit(y1)
    y2 = epsilon_limit(y2)
    Math.sqrt( Math.pow(y2 - y1,2) + Math.pow(x2 - x1,2) )

  # NOTE: since this will be applied seperately to each pair of particles we only factor
  # in the mass of 1 particle
  gravity_force = (other_mass,distance) ->
    g * ( other_mass / Math.pow(distance,2) )

  merge_bodies = (body1,body2) ->
    merged = new Body(body1.mass + body2.mass)
    merged.init_into_scene(scene)

    body1vel = body1.velocity
    body2vel = body2.velocity

    # reduce impact of smaller body's velocity upon new body
    if body1.mass > body2.mass
      merged.pos = merged.w_pos = body1.pos
      body2vel = body2vel.multiplyScalar( (body2.mass / body1.mass) * 0.15 )
    else if body1.mass < body2.mass
      merged.pos = merged.w_pos = body2.pos
      body1vel = body1vel.multiplyScalar( (body2.mass / body1.mass) * 0.15 )
    else
      merged.pos = merged.w_pos = new THREE.Vector2( (body1.pos.x + body2.pos.x)/2, (body1.pos.y + body2.pos.y)/2 )

    # energy lost from collision
    # body1vel = body1vel.multiplyScalar(0.9)
    # body2vel = body2vel.multiplyScalar(0.9)

    merged.velocity = new THREE.Vector2(0.0,0.0).addVectors(body1vel,body2vel)
    merged



  # start sim
  do_think = ->
    do_sim_tick()

    # update working positions for next tick, update meshes in scene
    for body, idx in bodies
      body.pos = body.w_pos
      body.mesh.position.x = body.pos.x
      body.mesh.position.z = body.pos.y

    # get most-massive-body to focus on
    mmb = bodies.sort( (a,b) => if a.mass > b.mass then -1 else if a.mass < b.mass then 1 else 0 )[0]
    mmb = {pos: {x:0,y:0}}

    origin.set(mmb.pos.x,0.0,mmb.pos.y)
    camera.position.set(mmb.pos.x,50.0,mmb.pos.y)
    camera.lookAt(origin)

    stats_el.innerHTML = "ticks: #{tick_count}, frames: #{frame_count}, bodies: #{bodies.length}, mmb: #{mmb.mass}"
    tick_count += 1

    # if tick_count % 1000 == 0
      # create_bodies(100)

    setTimeout(do_think,1000.0 / 60)
  # setInterval(do_think,1000.0 / 60)
  do_think()

  do_render = ->
    # return if tick_count >= 50000
    requestAnimationFrame(do_render)
    renderer.render(scene,camera)
    frame_count += 1

  do_render()


)

window.addEventListener("load",_run)
