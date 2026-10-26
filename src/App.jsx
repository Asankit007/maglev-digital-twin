import { useEffect, useRef, useState } from "react";



import Globe from "react-globe.gl";



import {

  Play,

  Pause,

  RotateCcw,

  AlertTriangle,

  ArrowUp,

  ArrowDown,

  Activity,

  Magnet,

  Gauge,

  Cpu,

  Zap,

  Settings2,

  Radio,

  CircleDot,

  Power,

  Rotate3D,

  Ruler,

  Target,

} from "lucide-react";



import { MagLevSimulator } from "./simulation/simulator";





// ============================================================

// 3D GLOBE COMPONENT

// ============================================================



function Globe3D({ running, rotating }) {

  const globeRef = useRef(null);



  useEffect(() => {

    let timer;



    const setupGlobe = () => {

      if (!globeRef.current) {

        return;

      }



      const controls = globeRef.current.controls();



      controls.enableZoom = false;

      controls.enablePan = false;



      controls.autoRotate = rotating;

      controls.autoRotateSpeed = 0.28;



      globeRef.current.pointOfView(

        {

          lat: 20,

          lng: 70,

          altitude: 2.15,

        },

        0

      );

    };



    timer = setTimeout(setupGlobe, 300);



    return () => {

      clearTimeout(timer);

    };

  }, []);



  useEffect(() => {

    if (!globeRef.current) {

      return;

    }



    const controls = globeRef.current.controls();



    controls.autoRotate = rotating;



    /*

      Very slow rotation.

      Positive = one direction

      Negative = opposite direction

    */



    controls.autoRotateSpeed = 0.28;

  }, [rotating]);



  return (

    <div

      className={`relative w-[250px] h-[250px] md:w-[285px] md:h-[285px] ${

        running ? "globe-running" : ""

      }`}

    >



      {/* Outer glow */}



      <div

        className={`absolute inset-3 rounded-full blur-2xl pointer-events-none ${

          running

            ? "bg-cyan-400/20"

            : "bg-slate-500/10"

        }`}

      />



      {/* 3D Globe */}



      <div className="absolute inset-0">



        <Globe

          ref={globeRef}



          width={285}

          height={285}



          backgroundColor="rgba(0,0,0,0)"



          globeImageUrl="/world-map-texture.png"



          showAtmosphere={true}



          atmosphereColor="#22d3ee"



          atmosphereAltitude={0.12}



          animateIn={true}



          enablePointerInteraction={true}



          rendererConfig={{

            antialias: true,

            alpha: true,

          }}

        />



      </div>



      {/* Outer technical ring */}



      <div className="absolute inset-[14px] rounded-full border border-cyan-400/20 pointer-events-none" />



      <div className="absolute inset-[7px] rounded-full border border-white/5 pointer-events-none" />



    </div>

  );

}





// ============================================================

// MAIN APP

// ============================================================



function App() {



  // ============================================================

  // SIMULATOR

  // ============================================================



  const simulator = useRef(new MagLevSimulator());





  // ============================================================

  // STATE

  // ============================================================



  const [running, setRunning] = useState(false);



  const [emergencyStop, setEmergencyStop] = useState(false);



  const [distance, setDistance] = useState(40);



  const [setpoint, setSetpoint] = useState(40);



  const [globeRotating, setGlobeRotating] =

    useState(true);

  // ============================================================
  // 3D SYSTEM VIEW
  // ============================================================

  const [systemRotation, setSystemRotation] = useState({ x: -7, y: 0 });
  const systemDrag = useRef({ active: false, pointerId: null, lastX: 0, lastY: 0 });

  
const handleSystemPointerDown = (event) => {
  // Do not start dragging when clicking buttons or controls
  if (event.target.closest?.("button, input, a, canvas")) {
    return;
  }

  systemDrag.current = {
    active: true,
    pointerId: event.pointerId,
    lastX: event.clientX,
    lastY: event.clientY,
  };

  event.currentTarget.setPointerCapture?.(event.pointerId);
};


  const handleSystemPointerMove = (event) => {
    const drag = systemDrag.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    setSystemRotation((previous) => ({
      x: Math.max(-55, Math.min(55, previous.x - dy * 0.32)),
      y: previous.y + dx * 0.38,
    }));
  };

  const handleSystemPointerUp = (event) => {
    if (systemDrag.current.pointerId === event.pointerId) {
      systemDrag.current.active = false;
      systemDrag.current.pointerId = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  const resetSystemView = () => setSystemRotation({ x: -7, y: 0 });






  // ============================================================

  // TELEMETRY

  // ============================================================



  const [telemetry, setTelemetry] = useState({



    distance: 40,



    sensor: 40,



    setpoint: 40,



    error: 0,



    pTerm: 0,



    iTerm: 0,



    dTerm: 0,



    pidOutput: 0,



    pwm: 23.5,



    velocity: 0,



    acceleration: 0,



    magneticForce: 1,



    gravityForce: 1,



  });





  const [history, setHistory] = useState([]);





  // ============================================================

  // PID

  // ============================================================



  const [kp, setKp] = useState(1.8);



  const [ki, setKi] = useState(0.08);



  const [kd, setKd] = useState(0.45);





  // ============================================================

  // CONSTANTS

  // ============================================================



  const MIN_DISTANCE = 20;



  const MAX_DISTANCE = 70;





  // ============================================================

  // SIMULATION LOOP

  // ============================================================



  useEffect(() => {



    if (!running || emergencyStop) {

      return;

    }



    const interval = setInterval(() => {



      const result =

        simulator.current.step(0.02);



      setDistance(result.distance);



      setTelemetry(result);





      setHistory((previous) => {



        const next = [



          ...previous,



          {



            time: Date.now(),



            distance: result.distance,



            sensor: result.sensor,



            setpoint: result.setpoint,



            error: result.error,



          },



        ];



        return next.slice(-120);



      });



    }, 20);





    return () => {

      clearInterval(interval);

    };



  }, [running, emergencyStop]);





  // ============================================================

  // KEYBOARD CONTROLS

  // ============================================================



  useEffect(() => {



    const handleKeyDown = (event) => {



      if (

        event.target.tagName === "INPUT" ||

        event.target.tagName === "TEXTAREA"

      ) {

        return;

      }





      // Arrow Up



      if (event.key === "ArrowUp") {



        event.preventDefault();



        simulator.current.disturb(-1.5);



        setDistance(

          simulator.current.distance

        );



      }





      // Arrow Down



      if (event.key === "ArrowDown") {



        event.preventDefault();



        simulator.current.disturb(1.5);



        setDistance(

          simulator.current.distance

        );



      }





      // Space



      if (event.code === "Space") {



        event.preventDefault();



        if (!emergencyStop) {



          setRunning(

            (previous) => !previous

          );



        }



      }





      // R



      if (event.key.toLowerCase() === "r") {



        resetSimulation();



      }





      // E



      if (event.key.toLowerCase() === "e") {



        emergencyStopSimulation();



      }



    };





    window.addEventListener(

      "keydown",

      handleKeyDown

    );





    return () => {



      window.removeEventListener(

        "keydown",

        handleKeyDown

      );



    };



  }, [emergencyStop]);





  // ============================================================

  // START

  // ============================================================



  const startSimulation = () => {



    setEmergencyStop(false);



    setRunning(true);



  };





  // ============================================================

  // PAUSE

  // ============================================================



  const pauseSimulation = () => {



    setRunning(false);



  };





  // ============================================================

  // RESET

  // ============================================================



  const resetSimulation = () => {



    simulator.current.reset();



    simulator.current.setPID(

      kp,

      ki,

      kd

    );



    simulator.current.setSetpoint(

      setpoint

    );





    setRunning(false);



    setEmergencyStop(false);





    setDistance(40);





    setTelemetry({



      distance: 40,



      sensor: 40,



      setpoint,



      error: setpoint - 40,



      pTerm: 0,



      iTerm: 0,



      dTerm: 0,



      pidOutput: 0,



      pwm: 23.5,



      velocity: 0,



      acceleration: 0,



      magneticForce: 0,



      gravityForce: 0,



    });





    setHistory([]);



  };





  // ============================================================

  // EMERGENCY STOP

  // ============================================================



  const emergencyStopSimulation = () => {



    setRunning(false);



    setEmergencyStop(true);



  };





  // ============================================================

  // SETPOINT

  // ============================================================



  const handleSetpointChange = (

    event

  ) => {



    const value =

      Number(event.target.value);





    setSetpoint(value);





    simulator.current.setSetpoint(

      value

    );





    setTelemetry((previous) => ({



      ...previous,



      setpoint: value,



      error:

        value - previous.sensor,



    }));



  };





  // ============================================================

  // PID UPDATE

  // ============================================================



  const updatePID = (

    newKp,

    newKi,

    newKd

  ) => {



    simulator.current.setPID(

      newKp,

      newKi,

      newKd

    );



  };





  // ============================================================

  // MANUAL GLOBE POSITION

  // ============================================================



  const handleManualDistance = (

    event

  ) => {



    if (running) {

      return;

    }





    const value =

      Number(event.target.value);





    simulator.current.distance =

      value;



    simulator.current.velocity = 0;





    setDistance(value);





    setTelemetry((previous) => ({



      ...previous,



      distance: value,



      sensor: value,



      error:

        setpoint - value,



    }));



  };





  // ============================================================

  // DISTURBANCE

  // ============================================================



  const disturbUp = () => {



    simulator.current.disturb(-5);



    setDistance(

      simulator.current.distance

    );



  };





  const disturbDown = () => {



    simulator.current.disturb(5);



    setDistance(

      simulator.current.distance

    );



  };





  // ============================================================

  // VISUAL POSITION

  // ============================================================



  const normalizedDistance =

    (distance - MIN_DISTANCE) /

    (MAX_DISTANCE - MIN_DISTANCE);





  const globeTop =

    170 +

    normalizedDistance * 295;





  const setpointTop =

    170 +

    ((setpoint - MIN_DISTANCE) /

      (MAX_DISTANCE - MIN_DISTANCE)) *

      295;





  const magnetBottom = 145;





  const physicalGap =

    Math.max(

      20,

      globeTop - magnetBottom

    );





  // ============================================================

  // GRAPH

  // ============================================================



  const graphPoints =

    history.length > 1

      ? history

          .map((point, index) => {



            const x =

              (index /

                Math.max(

                  history.length - 1,

                  1

                )) *

              100;





            const error =
              Number(point.error ?? (point.setpoint - point.distance));

            const GRAPH_MIN = -30;
            const GRAPH_MAX = 40;

            const normalized =
              (error - GRAPH_MIN) /
              (GRAPH_MAX - GRAPH_MIN);

            const y =
              100 -
              normalized * 100;





            return `${x},${y}`;



          })

          .join(" ")

      : "";





  const setpointGraph =

    history.length > 1

      ? history

          .map((_, index) => {



            const x =

              (index /

                Math.max(

                  history.length - 1,

                  1

                )) *

              100;





            const error = 0;

            const GRAPH_MIN = -30;
            const GRAPH_MAX = 40;

            const normalized =
              (error - GRAPH_MIN) /
              (GRAPH_MAX - GRAPH_MIN);

            const y =
              100 -
              normalized * 100;





            return `${x},${y}`;



          })

          .join(" ")

      : "";





  // ============================================================

  // STATUS

  // ============================================================



  let systemStatus = "READY";





  if (emergencyStop) {



    systemStatus =

      "EMERGENCY STOP";



  } else if (running) {



    systemStatus =

      "LEVITATING";



  } else {



    systemStatus =

      "PAUSED";



  }





  // ============================================================

  // RENDER

  // ============================================================



  return (



    <div className="min-h-screen bg-[#050b14] text-white">



      {/* ======================================================

          HEADER

      ====================================================== */}



      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#07111f]/95 backdrop-blur-xl">



        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4">



          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">



            {/* TITLE */}



            <div className="flex items-center gap-4">



              <div className="relative">



                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-cyan-500/20 border border-cyan-400/20 flex items-center justify-center">



                  <Magnet

                    size={27}

                    className="text-cyan-300"

                  />



                </div>



                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-[#07111f]" />



              </div>





              <div>



                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">



                  MagLev{" "}



                  <span className="text-cyan-300">



                    Digital Twin



                  </span>



                </h1>





                <p className="text-xs md:text-sm text-slate-400 mt-1">



                  Magnetic Levitation Closed-Loop Simulation



                </p>



              </div>



            </div>





            {/* STATUS */}



            <div className="flex flex-wrap items-center gap-3">



              <div

                className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${

                  emergencyStop

                    ? "bg-red-500/10 border-red-500/40 text-red-400"

                    : running

                    ? "bg-green-500/10 border-green-500/40 text-green-400"

                    : "bg-yellow-500/10 border-yellow-500/40 text-yellow-300"

                }`}

              >



                <span

                  className={`w-2.5 h-2.5 rounded-full ${

                    emergencyStop

                      ? "bg-red-400"

                      : running

                      ? "bg-green-400 animate-pulse"

                      : "bg-yellow-400"

                  }`}

                />



                <span className="text-sm font-bold">



                  {systemStatus}



                </span>



              </div>





              <div className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-400/30 text-purple-300 text-sm font-semibold">



                SIMULATION MODE



              </div>



            </div>



          </div>



        </div>



      </header>





      {/* ======================================================

          MAIN

      ====================================================== */}



      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">





        {/* ====================================================

            TOP METRICS

        ==================================================== */}



        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">



          <MetricCard

            icon={<Activity size={18} />}

            label="Actual Distance"

            value={`${distance.toFixed(2)} mm`}

            accent="cyan"

          />





          <MetricCard

            icon={<Target size={18} />}

            label="Target Setpoint"

            value={`${setpoint.toFixed(2)} mm`}

            accent="green"

          />





          <MetricCard

            icon={<Zap size={18} />}

            label="PWM Output"

            value={`${telemetry.pwm.toFixed(2)} %`}

            accent="yellow"

          />





          <MetricCard

            icon={<Cpu size={18} />}

            label="PID Output"

            value={telemetry.pidOutput.toFixed(3)}

            accent="purple"

          />



        </div>





        {/* ====================================================

            MAIN GRID

        ==================================================== */}



        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">





          {/* ==================================================

              PHYSICAL MODEL

          ================================================== */}



          <section className="xl:col-span-2 rounded-2xl overflow-hidden border border-slate-800 bg-[#091421] shadow-2xl">



            {/* HEADER */}



            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">



              <div>



                <div className="flex items-center gap-2">



                  <CircleDot

                    size={18}

                    className="text-cyan-400"

                  />



                  <h2 className="font-semibold text-lg">



                    Physical Levitation Model



                  </h2>



                </div>





                <p className="text-xs text-slate-500 mt-1">



                  Hardware-inspired 3D simulation



                </p>



              </div>





              <div className="flex items-center gap-3">



                <div className="text-xs text-slate-500 font-mono">



                  20–70 mm



                </div>



              </div>



            </div>





            {/* ==================================================

                CHAMBER

            ================================================== */}



            <div className="relative h-[690px] overflow-hidden">





              {/* BACKGROUND */}



              <div

                className="absolute inset-0"

                style={{

                  background:

                    "radial-gradient(circle at 45% 35%, rgba(17,64,91,.35), transparent 40%), linear-gradient(180deg,#06101c,#091725 55%,#050b12)",

                }}

              />





              {/* GRID */}



              <div

                className="absolute inset-0 opacity-[0.07]"

                style={{

                  backgroundImage:

                    "linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg,#64748b 1px,transparent 1px)",

                  backgroundSize: "38px 38px",

                }}

              />

              {/* =================================================
                  INTERACTIVE 3D SYSTEM STAGE
              ================================================= */}

              <div
                className="absolute inset-0 select-none"
                style={{ perspective: "1400px", perspectiveOrigin: "50% 42%", cursor: systemDrag.current.active ? "grabbing" : "grab" }}
                onPointerDown={handleSystemPointerDown}
                onPointerMove={handleSystemPointerMove}
                onPointerUp={handleSystemPointerUp}
                onPointerCancel={handleSystemPointerUp}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    transform: `rotateX(${systemRotation.x}deg) rotateY(${systemRotation.y}deg)`,
                    transformStyle: "preserve-3d",
                    transformOrigin: "50% 48%",
                    transition: systemDrag.current.active ? "none" : "transform 180ms ease-out",
                  }}
                >

                  <div
                    className="absolute left-[7%] right-[7%] top-[4%] bottom-[5%] rounded-[30px] border border-white/[0.06] bg-gradient-to-br from-white/[0.035] via-transparent to-black/20"
                    style={{ transform: "translateZ(-55px)", boxShadow: "inset 0 0 90px rgba(0,0,0,.48)" }}
                  />
                  <div
                    className="absolute left-[11%] right-[14%] bottom-[4%] h-20 rounded-full bg-black/45 blur-2xl"
                    style={{ transform: "translateZ(-30px) rotateX(72deg)" }}
                  />


                  {/* =================================================
                      DISTANCE RULER
                  ================================================= */}



              <div className="absolute left-5 top-16 bottom-20 w-14 z-40">



                <div className="absolute left-8 top-0 bottom-0 border-l border-cyan-400/30" />





                {[20, 30, 40, 50, 60, 70].map(

                  (value) => {



                    const position =

                      ((value - 20) /

                        50) *

                      100;





                    return (



                      <div

                        key={value}

                        className="absolute left-0 flex items-center gap-2"

                        style={{

                          top: `${position}%`,

                        }}

                      >



                        <span className="text-[11px] text-slate-400 font-mono w-5 text-right">



                          {value}



                        </span>



                        <div className="w-4 border-t border-cyan-400/40" />



                      </div>



                    );



                  }

                )}





                <span className="absolute -top-7 left-0 text-[10px] text-cyan-300 uppercase tracking-wider">



                  Error



                </span>



                <span className="absolute -top-4 left-0 text-[9px] text-slate-500">



                  mm



                </span>



              </div>





              {/* =================================================

                  RED TOP FRAME

              ================================================= */}



              <div

                className="absolute z-10 left-[18%] right-[11%] top-7 h-[36px] rounded-md"

                style={{

                  background:

                    "linear-gradient(180deg,#ff3b30,#d91515 50%,#8d0b0b)",

                  boxShadow:

                    "0 5px 18px rgba(255,30,30,.25), inset 0 2px 2px rgba(255,255,255,.3)",

                }}

              >



                <div className="absolute left-4 right-4 top-1 h-1 bg-red-300/30 rounded-full" />



              </div>





              {/* =================================================

                  RED VERTICAL STAND

              ================================================= */}



              <div

                className="absolute z-10 right-[11%] top-12 w-[46px] h-[570px] rounded-b-xl"

                style={{

                  background:

                    "linear-gradient(90deg,#7f0808,#e51b1b 38%,#a30d0d 72%,#650606)",

                  boxShadow:

                    "inset 4px 0 5px rgba(255,255,255,.15), 6px 0 20px rgba(0,0,0,.45)",

                }}

              >



                <div className="absolute left-2 top-3 bottom-8 w-2 bg-red-300/20 rounded-full" />



              </div>





              {/* =================================================

                  BOTTOM BASE

              ================================================= */}



              <div className="absolute z-10 left-[9%] right-[10%] bottom-8 h-[74px]">



                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyan-300/30 via-cyan-500/10 to-cyan-300/20 border border-cyan-300/20" />





                <div

                  className="absolute left-7 right-7 top-3 bottom-0 rounded-sm"

                  style={{

                    background:

                      "linear-gradient(180deg,#e52222,#a90e0e 80%,#710707)",

                    boxShadow:

                      "0 7px 18px rgba(0,0,0,.6), inset 0 2px 2px rgba(255,255,255,.15)",

                  }}

                />



              </div>





              {/* =================================================

                  PILLAR BASE

              ================================================= */}



              <div className="absolute z-20 right-[10.5%] bottom-[79px] w-[58px] h-[50px]">



                <div className="absolute bottom-0 left-0 right-0 h-4 rounded-full bg-red-700 border border-red-300/20" />



                <div className="absolute left-3 right-3 bottom-3 h-9 rounded-t-xl bg-gradient-to-r from-red-900 via-red-500 to-red-900" />



                <div className="absolute -left-2 top-2 w-12 h-5 rounded-full bg-gradient-to-b from-slate-300 to-slate-700 border border-slate-400/50 rotate-[-2deg]" />



              </div>





              {/* =================================================

                  ELECTROMAGNET

              ================================================= */}



              <div className="absolute z-30 left-[31%] top-[52px]">



                {/* Mount */}



                <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-24 h-7 rounded-b-xl bg-gradient-to-b from-slate-500 to-slate-900 border border-slate-500/50" />





                <div className="relative w-[116px] h-[112px]">



                  {/* Top metal */}



                  <div

                    className="absolute left-1/2 -translate-x-1/2 top-0 w-[94px] h-[18px] rounded-t-xl"

                    style={{

                      background:

                        "linear-gradient(180deg,#4b5563,#111827)",

                    }}

                  />





                  {/* Core */}



                  <div className="absolute left-[18px] right-[18px] top-4 h-[77px] rounded-b-xl bg-gradient-to-b from-slate-700 via-slate-950 to-black border border-slate-600/50" />





                  {/* Copper winding */}



                  <div className="absolute left-[25px] right-[25px] top-[18px] h-[66px] overflow-hidden rounded-b-lg">



                    {Array.from({

                      length: 13,

                    }).map((_, index) => (



                      <div

                        key={index}

                        className="absolute left-0 right-0 h-[7px] rounded-sm"

                        style={{

                          top:

                            `${index * 5}px`,

                          background:

                            "linear-gradient(180deg,#ffd166,#d97706,#92400e,#f59e0b)",

                          boxShadow:

                            "0 1px 1px rgba(255,255,255,.25)",

                        }}

                      />



                    ))}



                  </div>





                  {/* Pole */}



                  <div className="absolute left-[35px] right-[35px] bottom-0 h-[17px] rounded-b-xl bg-black border border-slate-700" />



                </div>





                {/* PCB */}



                <div className="absolute left-[105px] top-[45px] w-[135px] h-[30px] rounded-sm bg-[#31523d] border border-green-300/30 shadow-lg">



                  <div className="absolute left-3 top-1 w-7 h-6 rounded-sm bg-black/70 border border-slate-600" />



                  <div className="absolute left-12 top-2 w-7 h-4 bg-slate-700 rounded-sm" />



                  <div className="absolute right-3 top-2 w-6 h-4 bg-white/70 rounded-sm" />



                </div>





                {/* Wires */}



                <div className="absolute left-[215px] top-[47px] w-[110px] h-[5px] bg-red-500 rounded-full rotate-[8deg] origin-left" />



                <div className="absolute left-[215px] top-[56px] w-[110px] h-[4px] bg-black rounded-full rotate-[8deg] origin-left" />



              </div>





              {/* =================================================

                  MAGNETIC FIELD

              ================================================= */}



              <div

                className="absolute z-5 left-[40%] top-[125px] pointer-events-none"

                style={{

                  width:

                    `${140 + telemetry.pwm * 1.25}px`,

                  height: "320px",

                  transform:

                    "translateX(-50%)",

                  maxWidth: "310px",

                }}

              >



                {[0, 1, 2, 3].map(

                  (index) => (



                    <div

                      key={index}

                      className="absolute left-1/2 top-0 -translate-x-1/2 rounded-[50%] border border-cyan-400/30"

                      style={{

                        width:

                          `${100 - index * 18}%`,

                        height: "100%",

                        opacity:

                          0.28 -

                          index * 0.045,

                      }}

                    />



                  )

                )}





                <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.25em] text-cyan-300/60 whitespace-nowrap">



                  MAGNETIC FIELD



                </div>





                <div className="absolute left-[15%] top-[42%] w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />



                <div className="absolute right-[18%] top-[55%] w-1 h-1 rounded-full bg-cyan-300 animate-pulse" />



                <div className="absolute left-[25%] top-[70%] w-1 h-1 rounded-full bg-cyan-300 animate-pulse" />



              </div>





              {/* =================================================

                  DISTANCE MEASUREMENT

              ================================================= */}



              <div

                className="absolute z-40 left-[40%] -translate-x-1/2"

                style={{

                  top:

                    `${magnetBottom}px`,

                  height:

                    `${physicalGap}px`,

                }}

              >



                <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-white/40" />





                {/* Top arrow */}



                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent border-b-cyan-300" />





                {/* Bottom arrow */}



                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-cyan-300" />





                <div className="absolute left-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md bg-black/80 border border-cyan-400/30 whitespace-nowrap">



                  <div className="flex items-center gap-2">



                    <Ruler

                      size={13}

                      className="text-cyan-300"

                    />



                    <span className="text-cyan-300 text-xs font-mono font-bold">



                      {distance.toFixed(2)}

                      {" "}

                      mm



                    </span>



                  </div>



                </div>



              </div>





              {/* =================================================

                  3D GLOBE

              ================================================= */}



              <div

                className="absolute z-30 left-[40%] -translate-x-1/2"

                style={{

                  top:

                    `${globeTop}px`,



                  transition: running

                    ? "top 0.02s linear"

                    : "top 0.12s ease-out",

                }}

              >



                <Globe3D

                  running={running}

                  rotating={

                    globeRotating

                  }

                />





                {/* Distance badge */}



                <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-1">



                  <div className="px-4 py-1.5 rounded-full bg-black/90 border border-cyan-400/30 shadow-lg">



                    <span className="text-cyan-300 font-mono text-sm font-semibold">



                      {distance.toFixed(2)}

                      {" "}

                      mm



                    </span>



                  </div>



                </div>



              </div>





              {/* =================================================

                  SETPOINT

              ================================================= */}



              <div

                className="absolute z-20 left-20 right-20 border-t border-dashed border-green-400/70"

                style={{

                  top:

                    `${setpointTop}px`,

                }}

              >



                <div className="absolute left-0 -top-7">



                  <div className="flex items-center gap-2">



                    <div className="w-2 h-2 rounded-full bg-green-400" />



                    <span className="text-xs font-semibold text-green-400">



                      SETPOINT



                    </span>



                  </div>





                  <span className="text-xs text-green-300 font-mono ml-4">



                    {setpoint.toFixed(1)}

                    {" "}

                    mm



                  </span>



                </div>



              </div>





              {/* =================================================

                  GLOBE ROTATION CONTROL

              ================================================= */}



              <div className="absolute top-5 right-5 z-50">



                <button

                  onClick={() =>

                    setGlobeRotating(

                      (previous) =>

                        !previous

                    )

                  }

                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition ${

                    globeRotating

                      ? "bg-cyan-400/10 border-cyan-400/30 text-cyan-300"

                      : "bg-slate-800/80 border-slate-700 text-slate-500"

                  }`}

                >



                  <Rotate3D

                    size={14}

                  />



                  {globeRotating

                    ? "3D Rotation ON"

                    : "3D Rotation OFF"}



                </button>



              </div>





              {/* Hardware label */}



              <div className="absolute bottom-28 left-1/2 -translate-x-1/2">



                <div className="px-4 py-2 rounded-lg bg-black/60 border border-red-500/20 text-[10px] text-slate-400 tracking-wider whitespace-nowrap">



                  RED FRAME • COPPER ELECTROMAGNET • 3D GLOBE



                </div>



              </div>

                </div>

                <div className="absolute top-5 left-5 z-[80] flex items-center gap-2 pointer-events-auto">
                  <div className="px-3 py-2 rounded-lg bg-black/65 border border-cyan-400/20 text-[10px] text-cyan-200 tracking-wider backdrop-blur-sm">
                    DRAG TO ROTATE 3D SYSTEM
                  </div>
                  <button
                    type="button"
                    onClick={resetSystemView}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200 transition"
                  >
                    <Rotate3D size={14} /> Reset 3D View
                  </button>
                </div>
              </div>



            </div>



          </section>





          {/* ==================================================

              RIGHT CONTROL PANEL

          ================================================== */}



          <div className="space-y-5">





            {/* ==================================================

                SIMULATION CONTROL

            ================================================== */}



            <Panel

              title="Simulation Control"

              icon={

                <Settings2

                  size={18}

                />

              }

            >



              <label className="text-sm text-slate-300">



                Target Distance



              </label>





              <div className="flex items-center gap-3 mt-3">



                <input

                  type="range"

                  min="20"

                  max="70"

                  step="0.5"

                  value={setpoint}

                  onChange={

                    handleSetpointChange

                  }

                  className="w-full accent-cyan-400"

                />





                <div className="w-20 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-center font-mono text-cyan-300">



                  {setpoint.toFixed(1)}



                </div>



              </div>





              <div className="flex justify-between text-[10px] text-slate-600 mt-1">



                <span>20 mm</span>



                <span>70 mm</span>



              </div>





              {/* Manual */}



              <div className="mt-6">



                <div className="flex justify-between">



                  <label className="text-sm text-slate-300">



                    Manual Globe Position



                  </label>



                  <span className="text-xs text-slate-500">



                    {running

                      ? "Pause to adjust"

                      : "Available"}



                  </span>



                </div>





                <div className="flex items-center gap-3 mt-3">



                  <input

                    type="range"

                    min="20"

                    max="70"

                    step="0.5"

                    value={distance}

                    onChange={

                      handleManualDistance

                    }

                    disabled={running}

                    className="w-full accent-purple-400 disabled:opacity-30"

                  />





                  <div className="w-20 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-center font-mono text-purple-300">



                    {distance.toFixed(1)}



                  </div>



                </div>



              </div>





              {/* Buttons */}



              <div className="grid grid-cols-3 gap-2 mt-6">



                <button

                  onClick={

                    startSimulation

                  }

                  disabled={running}

                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-300 hover:bg-green-500/25 disabled:opacity-30 transition"

                >



                  <Play size={15} />



                  Start



                </button>





                <button

                  onClick={

                    pauseSimulation

                  }

                  disabled={!running}

                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/25 disabled:opacity-30 transition"

                >



                  <Pause size={15} />



                  Pause



                </button>





                <button

                  onClick={

                    resetSimulation

                  }

                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-700/40 border border-slate-600 text-slate-300 hover:bg-slate-700 transition"

                >



                  <RotateCcw size={15} />



                  Reset



                </button>



              </div>





              {/* Emergency */}



              <button

                onClick={

                  emergencyStopSimulation

                }

                className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 transition"

              >



                <AlertTriangle

                  size={16}

                />



                Emergency Stop



              </button>



            </Panel>





            {/* ==================================================

                PID

            ================================================== */}



            <Panel

              title="PID Controller"

              icon={

                <Cpu size={18} />

              }

            >



              <PIDSlider

                label="Kp"

                description="Proportional"

                value={kp}

                min={0}

                max={8}

                step={0.01}

                color="purple"

                onChange={(value) => {



                  setKp(value);



                  updatePID(

                    value,

                    ki,

                    kd

                  );



                }}

              />





              <PIDSlider

                label="Ki"

                description="Integral"

                value={ki}

                min={0}

                max={2}

                step={0.01}

                color="cyan"

                onChange={(value) => {



                  setKi(value);



                  updatePID(

                    kp,

                    value,

                    kd

                  );



                }}

              />





              <PIDSlider

                label="Kd"

                description="Derivative"

                value={kd}

                min={0}

                max={4}

                step={0.01}

                color="pink"

                onChange={(value) => {



                  setKd(value);



                  updatePID(

                    kp,

                    ki,

                    value

                  );



                }}

              />



            </Panel>





            {/* ==================================================

                DISTURBANCE

            ================================================== */}



            <Panel

              title="External Disturbance"

              icon={

                <Zap size={18} />

              }

            >



              <div className="grid grid-cols-2 gap-3">



                <button

                  onClick={

                    disturbUp

                  }

                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/10 border border-blue-400/30 text-blue-300 hover:bg-blue-500/20 transition"

                >



                  <ArrowUp size={18} />



                  Push Up



                </button>





                <button

                  onClick={

                    disturbDown

                  }

                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500/10 border border-orange-400/30 text-orange-300 hover:bg-orange-500/20 transition"

                >



                  <ArrowDown size={18} />



                  Push Down



                </button>



              </div>



            </Panel>





            {/* ==================================================

                3D INFO

            ================================================== */}



            <Panel

              title="3D Globe"

              icon={

                <Rotate3D

                  size={18}

                />

              }

            >



              <div className="space-y-3">



                <div className="flex items-center justify-between">



                  <span className="text-xs text-slate-500">



                    Auto Rotation



                  </span>



                  <span

                    className={

                      globeRotating

                        ? "text-green-400 text-xs font-semibold"

                        : "text-slate-500 text-xs"

                    }

                  >



                    {globeRotating

                      ? "ACTIVE"

                      : "PAUSED"}



                  </span>



                </div>





                <div className="flex items-center justify-between">



                  <span className="text-xs text-slate-500">



                    Rotation Speed



                  </span>



                  <span className="font-mono text-xs text-cyan-300">



                    0.28



                  </span>



                </div>





                <div className="text-[11px] text-slate-600 leading-5">



                  Drag the globe with your mouse to inspect the

                  3D surface. Zoom is intentionally disabled so

                  the levitation chamber remains stable.



                </div>



              </div>



            </Panel>



          </div>



        </div>





        {/* ====================================================

            GRAPH + TELEMETRY

        ==================================================== */}



        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">





          {/* GRAPH */}



          <section className="xl:col-span-2 rounded-2xl bg-[#091421] border border-slate-800 p-5">



            <div className="flex items-center justify-between mb-5">



              <div>



                <h2 className="font-semibold flex items-center gap-2">



                  <Activity

                    size={18}

                    className="text-cyan-400"

                  />



                  Real-Time Error Tracking



                </h2>





                <p className="text-xs text-slate-500 mt-1">



                  PID error: target distance − actual distance



                </p>



              </div>





              <div className="flex items-center gap-4 text-xs">



                <span className="flex items-center gap-2 text-cyan-300">



                  <span className="w-3 h-0.5 bg-cyan-400" />



                  Distance



                </span>





                <span className="flex items-center gap-2 text-green-300">



                  <span className="w-3 border-t border-dashed border-green-400" />



                  Zero Error



                </span>



              </div>



            </div>





            <div className="relative h-[270px] rounded-xl bg-[#050c15] border border-slate-800 overflow-hidden">





              {/* Grid */}



              <div

                className="absolute inset-0 opacity-20"

                style={{

                  backgroundImage:

                    "linear-gradient(#334155 1px,transparent 1px),linear-gradient(90deg,#334155 1px,transparent 1px)",

                  backgroundSize:

                    "10% 20%",

                }}

              />





              {/* Y axis */}



              <div className="absolute left-2 top-2 bottom-5 flex flex-col justify-between text-[10px] text-slate-600 font-mono">



                <span>+40</span>
                <span>+30</span>
                <span>+20</span>
                <span>+10</span>
                <span>0</span>
                <span>-10</span>
                <span>-20</span>
                <span>-30</span>



              </div>





              <svg

                viewBox="0 0 100 100"

                preserveAspectRatio="none"

                className="absolute left-8 right-4 top-2 bottom-6 w-auto h-auto z-10" style={{ width: "calc(100% - 48px)", height: "calc(100% - 32px)" }}

              >



                {setpointGraph && (



                  <polyline

                    points={

                      setpointGraph

                    }

                    fill="none"

                    stroke="#4ade80"

                    strokeWidth="1"

                    strokeDasharray="3 2"

                    vectorEffect="non-scaling-stroke"

                  />



                )}





                {graphPoints && (



                  <polyline

                    points={

                      graphPoints

                    }

                    fill="none"

                    stroke="#22d3ee"

                    strokeWidth="2.2"

                    vectorEffect="non-scaling-stroke"

                  />



                )}



              </svg>





              {history.length <= 1 && (



                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-600">



                  Press Start to generate telemetry



                </div>



              )}



            </div>



          </section>





          {/* TELEMETRY */}



          <section className="rounded-2xl bg-[#091421] border border-slate-800 p-5">



            <div className="flex items-center gap-2 mb-4">



              <Radio

                size={18}

                className="text-green-400"

              />



              <h2 className="font-semibold">



                Live Telemetry



              </h2>



            </div>





            <div className="grid grid-cols-2 gap-2">



              <TelemetryItem

                label="Distance"

                value={`${telemetry.distance.toFixed(2)} mm`}

                color="cyan"

              />





              <TelemetryItem

                label="Sensor"

                value={`${telemetry.sensor.toFixed(2)} mm`}

                color="green"

              />





              <TelemetryItem

                label="Error"

                value={`${telemetry.error.toFixed(3)} mm`}

                color="yellow"

              />





              <TelemetryItem

                label="P Term"

                value={telemetry.pTerm.toFixed(3)}

              />





              <TelemetryItem

                label="I Term"

                value={telemetry.iTerm.toFixed(3)}

              />





              <TelemetryItem

                label="D Term"

                value={telemetry.dTerm.toFixed(3)}

              />





              <TelemetryItem

                label="PID Output"

                value={telemetry.pidOutput.toFixed(3)}

                color="purple"

              />





              <TelemetryItem

                label="PWM"

                value={`${telemetry.pwm.toFixed(2)} %`}

                color="orange"

              />





              <TelemetryItem

                label="Velocity"

                value={telemetry.velocity.toFixed(3)}

              />





              <TelemetryItem

                label="Acceleration"

                value={telemetry.acceleration.toFixed(3)}

              />





              <TelemetryItem

                label="Magnetic Force"

                value={telemetry.magneticForce.toFixed(3)}

                color="cyan"

              />





              <TelemetryItem

                label="Gravity"

                value={telemetry.gravityForce.toFixed(3)}

                color="yellow"

              />



            </div>



          </section>



        </div>





        {/* ====================================================

            FORCE CARDS

        ==================================================== */}



        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">



          <InfoCard

            icon={

              <Magnet size={18} />

            }

            title="Magnetic Force"

            value={

              telemetry.magneticForce.toFixed(

                3

              )

            }

            text="Simulated upward electromagnetic force"

          />





          <InfoCard

            icon={

              <ArrowDown size={18} />

            }

            title="Gravity"

            value={

              telemetry.gravityForce.toFixed(

                3

              )

            }

            text="Simulated downward gravitational force"

          />





          <InfoCard

            icon={

              <Zap size={18} />

            }

            title="Controller Output"

            value={

              telemetry.pidOutput.toFixed(

                3

              )

            }

            text="PID correction applied to actuator PWM"

          />



        </div>





        {/* ====================================================

            HOW IT WORKS

        ==================================================== */}



        <section className="mt-5 rounded-2xl bg-[#091421] border border-slate-800 p-6">



          <div className="flex items-center gap-2 mb-6">



            <Magnet

              size={20}

              className="text-cyan-400"

            />



            <div>



              <h2 className="font-semibold text-lg">



                How Magnetic Levitation Works



              </h2>





              <p className="text-xs text-slate-500">



                Closed-loop control architecture



              </p>



            </div>



          </div>





          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">



            <Step

              number="01"

              title="Sensor"

              text="The simulated position sensor observes the globe position and produces feedback."

              color="cyan"

            />





            <Step

              number="02"

              title="Error"

              text="The measured position is compared with the required target setpoint."

              color="yellow"

            />





            <Step

              number="03"

              title="PID"

              text="Kp, Ki and Kd calculate the correction required to stabilize the globe."

              color="purple"

            />





            <Step

              number="04"

              title="Electromagnet"

              text="PWM controls the simulated electromagnetic force and changes globe position."

              color="red"

            />



          </div>



        </section>





        {/* ====================================================

            PROJECT ARCHITECTURE

        ==================================================== */}



        <section className="mt-5 rounded-2xl bg-[#091421] border border-slate-800 p-6">



          <div className="flex items-center gap-2 mb-5">



            <Cpu

              size={19}

              className="text-cyan-400"

            />



            <h2 className="font-semibold">



              Project Control Architecture



            </h2>



          </div>





          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">



            <ArchitectureBox

              number="01"

              title="Position Sensor"

              subtitle="Feedback"

            />



            <ArrowConnector />



            <ArchitectureBox

              number="02"

              title="Error"

              subtitle="Setpoint comparison"

            />



            <ArrowConnector />



            <ArchitectureBox

              number="03"

              title="PID"

              subtitle="Kp + Ki + Kd"

            />



            <ArrowConnector />



            <ArchitectureBox

              number="04"

              title="PWM"

              subtitle="Controller output"

            />



            <ArrowConnector />



            <ArchitectureBox

              number="05"

              title="Electromagnet"

              subtitle="Magnetic force"

            />



          </div>



        </section>





        {/* ====================================================

            KEYBOARD

        ==================================================== */}



        <section className="mt-5 rounded-2xl border border-slate-800 bg-[#091421] p-5">



          <div className="flex items-center gap-2 mb-4">



            <Power

              size={18}

              className="text-cyan-400"

            />



            <h2 className="font-semibold">



              Keyboard Controls



            </h2>



          </div>





          <div className="flex flex-wrap gap-4">



            <KeyControl

              keys="↑ ↓"

              text="Disturb Globe"

            />



            <KeyControl

              keys="SPACE"

              text="Start / Pause"

            />



            <KeyControl

              keys="R"

              text="Reset"

            />



            <KeyControl

              keys="E"

              text="Emergency Stop"

            />



          </div>



        </section>





        {/* FOOTER */}



        <div className="py-8 text-center text-xs text-slate-600">



          MagLev Digital Twin • 3D Hardware-Inspired Simulation • Closed-Loop Control



        </div>



      </main>



    </div>

  );

}





// ============================================================

// METRIC CARD

// ============================================================



function MetricCard({

  icon,

  label,

  value,

  accent,

}) {



  const colors = {



    cyan:

      "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",



    green:

      "text-green-300 bg-green-400/10 border-green-400/20",



    yellow:

      "text-yellow-300 bg-yellow-400/10 border-yellow-400/20",



    purple:

      "text-purple-300 bg-purple-400/10 border-purple-400/20",



  };





  return (



    <div className="rounded-xl border border-slate-800 bg-[#091421] p-4">



      <div className="flex items-center gap-3">



        <div

          className={`w-9 h-9 rounded-lg border flex items-center justify-center ${colors[accent]}`}

        >



          {icon}



        </div>





        <div>



          <p className="text-[10px] uppercase tracking-wider text-slate-500">



            {label}



          </p>





          <p className="text-lg font-bold font-mono mt-0.5">



            {value}



          </p>



        </div>



      </div>



    </div>



  );

}





// ============================================================

// PANEL

// ============================================================



function Panel({

  title,

  icon,

  children,

}) {



  return (



    <section className="rounded-2xl bg-[#091421] border border-slate-800 p-5">



      <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-800">



        <div className="text-cyan-400">



          {icon}



        </div>





        <h2 className="font-semibold">



          {title}



        </h2>



      </div>





      {children}



    </section>



  );

}





// ============================================================

// PID SLIDER

// ============================================================



function PIDSlider({

  label,

  description,

  value,

  min,

  max,

  step,

  color,

  onChange,

}) {



  const accent =

    color === "purple"

      ? "accent-purple-400"

      : color === "pink"

      ? "accent-pink-400"

      : "accent-cyan-400";





  return (



    <div className="mb-5">



      <div className="flex items-center justify-between mb-2">



        <div>



          <span className="font-semibold text-sm">



            {label}



          </span>





          <span className="text-xs text-slate-500 ml-2">



            ({description})



          </span>



        </div>





        <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 font-mono text-xs text-cyan-300">



          {value.toFixed(2)}



        </span>



      </div>





      <input

        type="range"

        min={min}

        max={max}

        step={step}

        value={value}

        onChange={(event) =>

          onChange(

            Number(event.target.value)

          )

        }

        className={`w-full ${accent}`}

      />





      <div className="flex justify-between text-[9px] text-slate-600 mt-1">



        <span>{min}</span>



        <span>{max}</span>



      </div>



    </div>



  );

}





// ============================================================

// TELEMETRY

// ============================================================



function TelemetryItem({

  label,

  value,

  color = "default",

}) {



  const textColor =

    color === "cyan"

      ? "text-cyan-300"

      : color === "green"

      ? "text-green-300"

      : color === "yellow"

      ? "text-yellow-300"

      : color === "purple"

      ? "text-purple-300"

      : color === "orange"

      ? "text-orange-300"

      : "text-slate-200";





  return (



    <div className="rounded-lg bg-[#050c15] border border-slate-800 p-3">



      <p className="text-[9px] uppercase tracking-wider text-slate-600">



        {label}



      </p>





      <p

        className={`font-mono font-semibold text-sm mt-1 ${textColor}`}

      >



        {value}



      </p>



    </div>



  );

}





// ============================================================

// INFO CARD

// ============================================================



function InfoCard({

  icon,

  title,

  value,

  text,

}) {



  return (



    <div className="rounded-2xl bg-[#091421] border border-slate-800 p-5">



      <div className="flex items-center gap-3">



        <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-300">



          {icon}



        </div>





        <div>



          <p className="text-xs text-slate-500">



            {title}



          </p>





          <p className="font-mono text-xl font-bold mt-1">



            {value}



          </p>



        </div>



      </div>





      <p className="text-xs text-slate-500 mt-4">



        {text}



      </p>



    </div>



  );

}





// ============================================================

// STEP

// ============================================================



function Step({

  number,

  title,

  text,

  color,

}) {



  const border =

    color === "cyan"

      ? "border-cyan-400/30"

      : color === "yellow"

      ? "border-yellow-400/30"

      : color === "purple"

      ? "border-purple-400/30"

      : "border-red-400/30";





  const textColor =

    color === "cyan"

      ? "text-cyan-300"

      : color === "yellow"

      ? "text-yellow-300"

      : color === "purple"

      ? "text-purple-300"

      : "text-red-300";





  return (



    <div

      className={`rounded-xl border ${border} bg-black/10 p-5`}

    >



      <div className="flex items-center gap-3 mb-4">



        <div

          className={`w-10 h-10 rounded-full border ${border} flex items-center justify-center font-mono font-bold ${textColor}`}

        >



          {number}



        </div>





        <h3

          className={`font-semibold ${textColor}`}

        >



          {title}



        </h3>



      </div>





      <p className="text-xs text-slate-500 leading-6">



        {text}



      </p>



    </div>



  );

}





// ============================================================

// ARCHITECTURE BOX

// ============================================================



function ArchitectureBox({

  number,

  title,

  subtitle,

}) {



  return (



    <div className="rounded-xl border border-slate-800 bg-[#050c15] p-4 text-center">



      <div className="text-[10px] text-cyan-400 font-mono mb-2">



        {number}



      </div>





      <div className="font-semibold text-sm">



        {title}



      </div>





      <div className="text-[10px] text-slate-600 mt-1">



        {subtitle}



      </div>



    </div>



  );

}





// ============================================================

// ARROW CONNECTOR

// ============================================================



function ArrowConnector() {



  return (



    <div className="hidden md:flex items-center justify-center text-slate-700">



      →



    </div>



  );

}





// ============================================================

// KEYBOARD CONTROL

// ============================================================



function KeyControl({

  keys,

  text,

}) {



  return (



    <div className="flex items-center gap-3">



      <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs text-slate-200">



        {keys}



      </div>





      <span className="text-xs text-slate-500">



        {text}



      </span>



    </div>



  );

}





export default App;