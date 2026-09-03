export interface QuizOption {
  id: 'A' | 'B' | 'C' | 'D'
  text: string
}

export interface QuizQuestion {
  id: number
  category: string
  text: string
  options: QuizOption[]
  correctId: 'A' | 'B' | 'C' | 'D'
  explanation?: string
}

export const QUIZ_QUESTION_BANK: QuizQuestion[] = [
  // Category: Concrete & Materials
  {
    id: 1,
    category: 'Concrete & Materials',
    text: 'What does RCC stand for in structural construction?',
    options: [
      { id: 'A', text: 'Reinforced Cement Concrete' },
      { id: 'B', text: 'Raw Calcium Compound' },
      { id: 'C', text: 'Rigid Carbon Composite' },
      { id: 'D', text: 'Refined Clay Cement' }
    ],
    correctId: 'A',
    explanation: 'RCC stands for Reinforced Cement Concrete, where steel bars reinforce concrete in tension.'
  },
  {
    id: 2,
    category: 'Concrete & Materials',
    text: 'What is the minimum grade of concrete recommended for reinforced concrete structural work as per IS 456?',
    options: [
      { id: 'A', text: 'M10' },
      { id: 'B', text: 'M15' },
      { id: 'C', text: 'M20' },
      { id: 'D', text: 'M25' }
    ],
    correctId: 'C',
    explanation: 'IS 456:2000 specifies M20 as the minimum grade for reinforced concrete structures.'
  },
  {
    id: 3,
    category: 'Concrete & Materials',
    text: 'The ratio of water to cement in a concrete mix primarily controls which property?',
    options: [
      { id: 'A', text: 'Color and texture' },
      { id: 'B', text: 'Compressive strength and porosity' },
      { id: 'C', text: 'Setting time only' },
      { id: 'D', text: 'Aggregate interlocking' }
    ],
    correctId: 'B',
    explanation: 'Abrams Law states that concrete compressive strength is inversely proportional to water-cement ratio.'
  },
  {
    id: 4,
    category: 'Concrete & Materials',
    text: 'Which industrial byproduct is widely used as a supplementary cementitious material to reduce heat of hydration?',
    options: [
      { id: 'A', text: 'Fly Ash' },
      { id: 'B', text: 'Bitumen' },
      { id: 'C', text: 'Limestone Dust' },
      { id: 'D', text: 'Quicklime' }
    ],
    correctId: 'A',
    explanation: 'Fly ash from thermal power plants acts as a pozzolana, enhancing durability and reducing carbon footprint.'
  },
  {
    id: 5,
    category: 'Concrete & Materials',
    text: 'What test is commonly performed on-site to verify the workability and consistency of fresh concrete?',
    options: [
      { id: 'A', text: 'Vicat needle test' },
      { id: 'B', text: 'Slump test' },
      { id: 'C', text: 'Core cutter test' },
      { id: 'D', text: 'Proctor compaction test' }
    ],
    correctId: 'B',
    explanation: 'The slump cone test measures fresh concrete consistency and workability before placement.'
  },
  {
    id: 6,
    category: 'Concrete & Materials',
    text: 'What is the initial setting time of standard Ordinary Portland Cement (OPC)?',
    options: [
      { id: 'A', text: 'Not less than 30 minutes' },
      { id: 'B', text: 'Not less than 5 minutes' },
      { id: 'C', text: 'Exactly 2 hours' },
      { id: 'D', text: 'Not less than 600 minutes' }
    ],
    correctId: 'A',
    explanation: 'Standard OPC must not set before 30 minutes to allow adequate transport and placement.'
  },
  {
    id: 7,
    category: 'Concrete & Materials',
    text: 'What does "TMT" stand for in reinforcing steel bars?',
    options: [
      { id: 'A', text: 'Thermal Mechanical Tension' },
      { id: 'B', text: 'Thermo-Mechanically Treated' },
      { id: 'C', text: 'Tensile Molded Titanium' },
      { id: 'D', text: 'Torsion-Milled Temper' }
    ],
    correctId: 'B',
    explanation: 'Thermo-Mechanically Treated steel has a tough outer martensitic rim and a ductile ferritic-pearlitic core.'
  },
  {
    id: 8,
    category: 'Concrete & Materials',
    text: 'In prestressed concrete, what type of steel is used due to its extremely high tensile strength?',
    options: [
      { id: 'A', text: 'Mild steel round bars' },
      { id: 'B', text: 'High-tensile steel strands/tendons' },
      { id: 'C', text: 'Cast iron tendons' },
      { id: 'D', text: 'Galvanized wrought iron' }
    ],
    correctId: 'B',
    explanation: 'High-tensile steel wires and strands are tensioned to produce pre-compression in concrete.'
  },

  // Category: Structural Mechanics & Systems
  {
    id: 9,
    category: 'Structural Mechanics',
    text: 'Which structural framework utilizes interconnected triangles to carry loads primarily through axial tension and compression?',
    options: [
      { id: 'A', text: 'Suspension cable' },
      { id: 'B', text: 'Truss' },
      { id: 'C', text: 'Arch' },
      { id: 'D', text: 'Portal frame' }
    ],
    correctId: 'B',
    explanation: 'A truss uses triangular units whose members ideally experience only axial tension or compression.'
  },
  {
    id: 10,
    category: 'Structural Mechanics',
    text: 'In a simply supported beam carrying a uniformly distributed load, where does the maximum bending moment occur?',
    options: [
      { id: 'A', text: 'At both supports' },
      { id: 'B', text: 'At the exact midspan' },
      { id: 'C', text: 'At one-third the span' },
      { id: 'D', text: 'Zero throughout' }
    ],
    correctId: 'B',
    explanation: 'For a simply supported beam with UDL, the maximum bending moment equals (wL^2)/8 at the midspan.'
  },
  {
    id: 11,
    category: 'Structural Mechanics',
    text: 'What structural phenomenon occurs when a slender vertical column abruptly buckles under excessive axial load?',
    options: [
      { id: 'A', text: 'Euler column buckling' },
      { id: 'B', text: 'Tensile rupture' },
      { id: 'C', text: 'Fatigue fracture' },
      { id: 'D', text: 'Plastic necking' }
    ],
    correctId: 'A',
    explanation: 'Euler buckling is the lateral instability failure of a slender column under critical axial compression.'
  },
  {
    id: 12,
    category: 'Structural Mechanics',
    text: 'Shear walls in high-rise buildings are primarily designed to resist which type of loads?',
    options: [
      { id: 'A', text: 'Dead gravity loads of furniture' },
      { id: 'B', text: 'Lateral wind and seismic earthquake loads' },
      { id: 'C', text: 'Thermal radiation from roofs' },
      { id: 'D', text: 'Direct soil uplift pressure' }
    ],
    correctId: 'B',
    explanation: 'Shear walls provide immense in-plane lateral stiffness against windstorms and earthquake ground motion.'
  },
  {
    id: 13,
    category: 'Structural Mechanics',
    text: 'What is a cantilever beam?',
    options: [
      { id: 'A', text: 'A beam supported freely on roller bearings at both ends' },
      { id: 'B', text: 'A beam fixed rigidly at one end and completely free at the other' },
      { id: 'C', text: 'A beam supported by 3 or more continuous columns' },
      { id: 'D', text: 'A beam hanging from overhead cables only' }
    ],
    correctId: 'B',
    explanation: 'A cantilever is fixed at one end and extends freely without support at the opposite end.'
  },
  {
    id: 14,
    category: 'Structural Mechanics',
    text: 'In beam cross-sections, which axis experiences neither tensile nor compressive bending stress?',
    options: [
      { id: 'A', text: 'Centroidal neutral axis' },
      { id: 'B', text: 'Extreme top compression fiber' },
      { id: 'C', text: 'Extreme bottom tension fiber' },
      { id: 'D', text: 'Perpendicular shear plane' }
    ],
    correctId: 'A',
    explanation: 'The neutral axis is where longitudinal bending strain and normal stress are exactly zero.'
  },

  // Category: High-Rise Architecture & Supertalls
  {
    id: 15,
    category: 'High-Rise Architecture',
    text: 'What innovative structural system allows the 828m Burj Khalifa in Dubai to reach its record height?',
    options: [
      { id: 'A', text: 'Bundled tube system' },
      { id: 'B', text: 'Buttressed core system with three hexagonal wings' },
      { id: 'C', text: 'Pure perimeter diagrid without internal columns' },
      { id: 'D', text: 'Suspended tension mast' }
    ],
    correctId: 'B',
    explanation: 'The Burj Khalifa uses a hexagonal central core buttressed by three aerodynamic wings.'
  },
  {
    id: 16,
    category: 'High-Rise Architecture',
    text: 'What device is suspended near the top of Taipei 101 to counteract high wind oscillations and typhoons?',
    options: [
      { id: 'A', text: 'Hydraulic jacks on foundations' },
      { id: 'B', text: 'A 660-metric-ton tuned mass damper pendulum' },
      { id: 'C', text: 'Rooftop counterweight elevators' },
      { id: 'D', text: 'Retractable roof sails' }
    ],
    correctId: 'B',
    explanation: 'Taipei 101 houses a giant spherical 660-tonne tuned mass damper that sways to dampen vibrations.'
  },
  {
    id: 17,
    category: 'High-Rise Architecture',
    text: 'Fazlur Rahman Khan revolutionized skyscraper engineering by introducing which structural concept in the Willis (Sears) Tower?',
    options: [
      { id: 'A', text: 'Bundled tube structural system' },
      { id: 'B', text: 'Inverted cantilever cone' },
      { id: 'C', text: 'Post-tensioned timber gridshell' },
      { id: 'D', text: 'Pneumatic air-supported dome' }
    ],
    correctId: 'A',
    explanation: 'Fazlur Khan invented the bundled tube design, grouping 9 tubes together for phenomenal stiffness.'
  },
  {
    id: 18,
    category: 'High-Rise Architecture',
    text: 'Why does the Shanghai Tower (632m) feature a 120-degree twisting exterior facade?',
    options: [
      { id: 'A', text: 'To reduce wind vortex shedding loads by up to 24%' },
      { id: 'B', text: 'Purely decorative aesthetic branding' },
      { id: 'C', text: 'To hold rooftop swimming pools' },
      { id: 'D', text: 'To prevent sunlight from entering office floors' }
    ],
    correctId: 'A',
    explanation: 'The aerodynamic twist disrupts wind vortexes, saving roughly $58 million in structural steel.'
  },
  {
    id: 19,
    category: 'High-Rise Architecture',
    text: 'What connects the twin towers of the Petronas Towers in Kuala Lumpur at levels 41 and 42?',
    options: [
      { id: 'A', text: 'A double-decker skybridge that slides on spherical bearings' },
      { id: 'B', text: 'A rigid welded steel girder tunnel' },
      { id: 'C', text: 'A monorail transit system' },
      { id: 'D', text: 'A suspended tension cable catenary' }
    ],
    correctId: 'A',
    explanation: 'The double-decker skybridge is designed to slide on bearings as the two towers sway independently.'
  },

  // Category: Geotechnical & Foundations
  {
    id: 20,
    category: 'Geotechnical Engineering',
    text: 'When soil bearing capacity is very weak or load is high, which foundation spreads the load across the entire building footprint?',
    options: [
      { id: 'A', text: 'Isolated spread footing' },
      { id: 'B', text: 'Raft / Mat foundation' },
      { id: 'C', text: 'Strip footing' },
      { id: 'D', text: 'Pad foundation' }
    ],
    correctId: 'B',
    explanation: 'A raft (mat) foundation is a thick reinforced concrete slab supporting the entire building structure.'
  },
  {
    id: 21,
    category: 'Geotechnical Engineering',
    text: 'Deep foundations that transfer skyscraper loads through weak upper strata to deep bedrock are known as:',
    options: [
      { id: 'A', text: 'Pile / Caisson foundations' },
      { id: 'B', text: 'Stepped footings' },
      { id: 'C', text: 'Grade beams' },
      { id: 'D', text: 'Shallow strip trenches' }
    ],
    correctId: 'A',
    explanation: 'Piles transmit immense superstructure loads to competent bedrock through end-bearing or skin friction.'
  },
  {
    id: 22,
    category: 'Geotechnical Engineering',
    text: 'What dangerous soil phenomenon causes water-saturated loose sand to act like a liquid during strong earthquakes?',
    options: [
      { id: 'A', text: 'Soil liquefaction' },
      { id: 'B', text: 'Soil consolidation' },
      { id: 'C', text: 'Lateral earth passive push' },
      { id: 'D', text: 'Frost heave' }
    ],
    correctId: 'A',
    explanation: 'Seismic shaking increases pore water pressure, eliminating shear strength and causing liquefaction.'
  },
  {
    id: 23,
    category: 'Geotechnical Engineering',
    text: 'What standard site test measures the penetration resistance of soil using a split-spoon sampler and a 63.5 kg hammer?',
    options: [
      { id: 'A', text: 'Standard Penetration Test (SPT)' },
      { id: 'B', text: 'Plate load bearing test' },
      { id: 'C', text: 'California Bearing Ratio (CBR)' },
      { id: 'D', text: 'Direct shear box test' }
    ],
    correctId: 'A',
    explanation: 'The SPT yields the N-value, indicating relative density and bearing strength of subsurface soils.'
  },

  // Category: Wind & Earthquake Dynamics
  {
    id: 24,
    category: 'Seismic & Wind Dynamics',
    text: 'Which Indian standard code provides guidelines for earthquake-resistant design of structures?',
    options: [
      { id: 'A', text: 'IS 456' },
      { id: 'B', text: 'IS 1893' },
      { id: 'C', text: 'IS 875' },
      { id: 'D', text: 'IS 800' }
    ],
    correctId: 'B',
    explanation: 'IS 1893 defines seismic zoning, response spectra, and seismic design criteria for structures in India.'
  },
  {
    id: 25,
    category: 'Seismic & Wind Dynamics',
    text: 'What technology decouples a building superstructure from destructive ground motions using flexible elastomeric bearings?',
    options: [
      { id: 'A', text: 'Base isolation system' },
      { id: 'B', text: 'Cantilever soil anchors' },
      { id: 'C', text: 'Cross-bracing weld joints' },
      { id: 'D', text: 'Post-tensioned slabs' }
    ],
    correctId: 'A',
    explanation: 'Base isolators absorb seismic energy and isolate the building from high-frequency ground accelerations.'
  },
  {
    id: 26,
    category: 'Seismic & Wind Dynamics',
    text: 'As building height increases, what lateral dynamic phenomenon creates periodic alternating cross-wind forces?',
    options: [
      { id: 'A', text: 'Vortex shedding' },
      { id: 'B', text: 'Capillary siphon' },
      { id: 'C', text: 'Venturi thermal draft' },
      { id: 'D', text: 'Acoustic resonance' }
    ],
    correctId: 'A',
    explanation: 'When wind passes a bluff body, alternating vortices peel off opposite sides, creating cross-wind oscillations.'
  },
  {
    id: 27,
    category: 'Seismic & Wind Dynamics',
    text: 'In the Indian seismic zone map, which zone represents the highest seismic hazard and earthquake risk?',
    options: [
      { id: 'A', text: 'Zone II' },
      { id: 'B', text: 'Zone III' },
      { id: 'C', text: 'Zone IV' },
      { id: 'D', text: 'Zone V' }
    ],
    correctId: 'D',
    explanation: 'Zone V represents areas susceptible to severe earthquakes (e.g., Kashmir, Northeast India, parts of Gujarat).'
  },

  // Category: Construction Management & Safety
  {
    id: 28,
    category: 'Construction Management',
    text: 'In project scheduling (CPM/PERT), what is the "Critical Path"?',
    options: [
      { id: 'A', text: 'The longest path of planned activities that determines shortest project duration' },
      { id: 'B', text: 'The emergency evacuation escape route on the jobsite' },
      { id: 'C', text: 'The route cranes take to haul prefabricated panels' },
      { id: 'D', text: 'The sequence of activities with maximum available float' }
    ],
    correctId: 'A',
    explanation: 'The Critical Path consists of zero-float activities; any delay on this path directly delays the project completion.'
  },
  {
    id: 29,
    category: 'Construction Management',
    text: 'What does BIM stand for in modern architectural and engineering workflows?',
    options: [
      { id: 'A', text: 'Building Information Modeling' },
      { id: 'B', text: 'Basic Infrastructure Management' },
      { id: 'C', text: 'Beam Interlock Measurement' },
      { id: 'D', text: 'Broadband Installation Map' }
    ],
    correctId: 'A',
    explanation: 'Building Information Modeling creates intelligent 3D digital representations with detailed project lifecycle data.'
  },
  {
    id: 30,
    category: 'Construction Management',
    text: 'A "Bar Bending Schedule" (BBS) specifies which of the following details on site?',
    options: [
      { id: 'A', text: 'Cut length, diameter, shape, and weight of steel reinforcement' },
      { id: 'B', text: 'Hourly wages for ironworkers' },
      { id: 'C', text: 'Concrete curing spray intervals' },
      { id: 'D', text: 'Crane swing angles' }
    ],
    correctId: 'A',
    explanation: 'BBS lists cut lengths, bar sizes, bending profiles, and total steel quantities for reinforcement fabrication.'
  },
  {
    id: 31,
    category: 'Construction Management',
    text: 'According to safety regulations, personal fall arrest systems (harnesses) are mandatory when working at heights above:',
    options: [
      { id: 'A', text: '1.8 meters (6 feet)' },
      { id: 'B', text: '10 meters (33 feet)' },
      { id: 'C', text: '0.5 meters (1.5 feet)' },
      { id: 'D', text: 'Only above 25 meters' }
    ],
    correctId: 'A',
    explanation: 'Most international and Indian safety regulations mandate fall protection at working heights of 1.8m (6 ft) or higher.'
  },

  // Category: Sustainability & Green Buildings
  {
    id: 32,
    category: 'Sustainability',
    text: 'What is India’s premier green building rating system developed by TERI and MNRE?',
    options: [
      { id: 'A', text: 'GRIHA (Green Rating for Integrated Habitat Assessment)' },
      { id: 'B', text: 'BREEAM' },
      { id: 'C', text: 'ENERGY STAR' },
      { id: 'D', text: 'GREEN GLOBE' }
    ],
    correctId: 'A',
    explanation: 'GRIHA is India’s national rating tool for assessing the environmental performance of buildings.'
  },
  {
    id: 33,
    category: 'Sustainability',
    text: 'What term defines the total greenhouse gas emissions generated to extract, manufacture, and transport building materials?',
    options: [
      { id: 'A', text: 'Embodied carbon' },
      { id: 'B', text: 'Operational carbon' },
      { id: 'C', text: 'Solar heat gain' },
      { id: 'D', text: 'Volatile organic compound (VOC)' }
    ],
    correctId: 'A',
    explanation: 'Embodied carbon represents emissions up to building completion, distinguishing it from operational energy use.'
  },
  {
    id: 34,
    category: 'Sustainability',
    text: 'Which type of double-glazed glass has an invisible metal oxide coating that reflects radiant heat while admitting light?',
    options: [
      { id: 'A', text: 'Low-E (Low-Emissivity) Glass' },
      { id: 'B', text: 'Frosted Glass' },
      { id: 'C', text: 'Fluted Reeded Glass' },
      { id: 'D', text: 'Annealed Plate Glass' }
    ],
    correctId: 'A',
    explanation: 'Low-E glass minimizes infrared and ultraviolet light transmission without compromising visible light.'
  },
  {
    id: 35,
    category: 'Sustainability',
    text: 'Rainwater harvesting in skyscrapers typically directs collected storm runoff for which non-potable uses?',
    options: [
      { id: 'A', text: 'Cooling tower makeup water, landscaping, and toilet flushing' },
      { id: 'B', text: 'Boiler steam for kitchen cooking' },
      { id: 'C', text: 'Electrical transformer cooling oil' },
      { id: 'D', text: 'Elevator shaft lubrication' }
    ],
    correctId: 'A',
    explanation: 'Captured rooftop rainwater dramatically offsets municipal freshwater demand for cooling towers and flushing.'
  },

  // Category: Surveying & Geometry
  {
    id: 36,
    category: 'Surveying & Geometry',
    text: 'What modern surveying instrument combines an electronic transit theodolite with an electronic distance meter (EDM)?',
    options: [
      { id: 'A', text: 'Total Station' },
      { id: 'B', text: 'Dumpy level' },
      { id: 'C', text: 'Planimeter' },
      { id: 'D', text: 'Prismatic compass' }
    ],
    correctId: 'A',
    explanation: 'A Total Station integrates an electronic theodolite, EDM, and internal microprocessor for precise 3D surveying.'
  },
  {
    id: 37,
    category: 'Surveying & Geometry',
    text: 'Imaginary lines joining points of equal elevation on the earth’s surface are called:',
    options: [
      { id: 'A', text: 'Contour lines' },
      { id: 'B', text: 'Isotherms' },
      { id: 'C', text: 'Isobars' },
      { id: 'D', text: 'Plumb lines' }
    ],
    correctId: 'A',
    explanation: 'Contour lines depict topography and elevation variations on site survey layouts.'
  },
  {
    id: 38,
    category: 'Surveying & Geometry',
    text: 'What tool ensures vertical alignment and true verticality during skyscraper column construction?',
    options: [
      { id: 'A', text: 'Optical or laser plummet' },
      { id: 'B', text: 'Spirit level with wood frame' },
      { id: 'C', text: 'T-square' },
      { id: 'D', text: 'Gunter’s chain' }
    ],
    correctId: 'A',
    explanation: 'Optical and laser plummets project a precise vertical line to check high-rise building plumbness.'
  },

  // Category: Building Services & Fire Safety
  {
    id: 39,
    category: 'Building Services',
    text: 'In high-rise construction, what prevents smoke from infiltrating vertical escape stairwells during a fire?',
    options: [
      { id: 'A', text: 'Positive pressure stairwell pressurization fans' },
      { id: 'B', text: 'Open louvered exterior windows' },
      { id: 'C', text: 'Negative pressure exhaust vacuum' },
      { id: 'D', text: 'Gravity roof gravity dampers' }
    ],
    correctId: 'A',
    explanation: 'Pressurization fans force high-pressure fresh air into stairwells, preventing toxic smoke from entering.'
  },
  {
    id: 40,
    category: 'Building Services',
    text: 'What is a "Refuge Area" in high-rise buildings as defined by the National Building Code (NBC)?',
    options: [
      { id: 'A', text: 'A fire-rated safe holding area for evacuees on designated intermediate floors' },
      { id: 'B', text: 'The garbage sorting room in the basement' },
      { id: 'C', text: 'The penthouse rooftop helicopter pad' },
      { id: 'D', text: 'The security guard control office' }
    ],
    correctId: 'A',
    explanation: 'NBC mandates fire-protected refuge floors for occupant staging and safety during vertical evacuation.'
  },

  // Category: Additional Architecture & Engineering
  {
    id: 41,
    category: 'High-Rise Architecture',
    text: 'The 30 St Mary Axe ("The Gherkin") in London uses which perimeter structural design that eliminates interior columns?',
    options: [
      { id: 'A', text: 'Curved steel diagrid system' },
      { id: 'B', text: 'Unreinforced masonry arches' },
      { id: 'C', text: 'Concrete shear walls at the perimeter' },
      { id: 'D', text: 'Cable-stayed suspension pylons' }
    ],
    correctId: 'A',
    explanation: 'A diagrid creates an aerodynamic diagonal steel perimeter lattice capable of carrying both gravity and wind loads.'
  },
  {
    id: 42,
    category: 'Structural Mechanics',
    text: 'What is the modulus of elasticity (E) of structural steel approximately equal to?',
    options: [
      { id: 'A', text: '200 GPa (2 x 10^5 N/mm²)' },
      { id: 'B', text: '20 GPa' },
      { id: 'C', text: '2,000 GPa' },
      { id: 'D', text: '50 GPa' }
    ],
    correctId: 'A',
    explanation: 'Young’s modulus for structural steel is standardized around 200,000 MPa (200 GPa).'
  },
  {
    id: 43,
    category: 'Concrete & Materials',
    text: 'What happens if concrete is allowed to dry out rapidly without proper water curing during the first 7 to 14 days?',
    options: [
      { id: 'A', text: 'Severe plastic shrinkage cracking and significant loss of final compressive strength' },
      { id: 'B', text: 'Concrete gains strength twice as fast' },
      { id: 'C', text: 'It automatically transforms into self-compacting concrete' },
      { id: 'D', text: 'Steel bars develop extra bonding strength' }
    ],
    correctId: 'A',
    explanation: 'Curing preserves moisture necessary for ongoing cement hydration, preventing drying shrinkage cracks.'
  },
  {
    id: 44,
    category: 'Concrete & Materials',
    text: 'Which chemical admixture is added to concrete to increase workability without adding extra water?',
    options: [
      { id: 'A', text: 'Superplasticizer (High-Range Water Reducer)' },
      { id: 'B', text: 'Calcium chloride accelerator' },
      { id: 'C', text: 'Sugar crystals' },
      { id: 'D', text: 'Aluminum powder' }
    ],
    correctId: 'A',
    explanation: 'Superplasticizers disperse cement particles through electrostatic repulsion, creating high-flow concrete.'
  },
  {
    id: 45,
    category: 'High-Rise Architecture',
    text: 'The iconic Empire State Building in New York completed construction in an astonishing duration of:',
    options: [
      { id: 'A', text: '1 year and 45 days (approx. 410 days)' },
      { id: 'B', text: '5 years and 6 months' },
      { id: 'C', text: '10 years' },
      { id: 'D', text: '3 years flat' }
    ],
    correctId: 'A',
    explanation: 'The 102-story Empire State Building rose at 4.5 floors per week, finishing in just 410 days during 1930–1931.'
  },
  {
    id: 46,
    category: 'Geotechnical Engineering',
    text: 'What is a "diaphragm wall" (slurry wall) commonly used for during skyscraper basement excavation?',
    options: [
      { id: 'A', text: 'To act as a deep water-retaining and earth-retaining perimeter barrier' },
      { id: 'B', text: 'To partition individual parking spaces' },
      { id: 'C', text: 'To filter air in basement ventilation shafts' },
      { id: 'D', text: 'To support electrical transformers' }
    ],
    correctId: 'A',
    explanation: 'Slurry diaphragm walls provide impermeable retaining structures for deep urban multi-level basement excavation.'
  },
  {
    id: 47,
    category: 'Structural Mechanics',
    text: 'In post-tensioned floor slabs, steel tendons are stressed:',
    options: [
      { id: 'A', text: 'After the concrete has reached sufficient compressive strength' },
      { id: 'B', text: 'Before concrete is poured into formwork' },
      { id: 'C', text: 'During aggregate mixing in batch plants' },
      { id: 'D', text: 'Only when the building is fully occupied' }
    ],
    correctId: 'A',
    explanation: 'In post-tensioning, tendons encased in ducts are pulled with hydraulic jacks after concrete sets.'
  },
  {
    id: 48,
    category: 'Wind & Dynamics',
    text: 'What is the purpose of opening aerodynamic gaps (sky vents) through the upper floors of supertall towers?',
    options: [
      { id: 'A', text: 'To allow extreme wind gusts to pass through, reducing overturning lateral pressure' },
      { id: 'B', text: 'To let birds fly across the building safely' },
      { id: 'C', text: 'To save on facade window cleaning costs' },
      { id: 'D', text: 'To improve mobile phone cellular reception' }
    ],
    correctId: 'A',
    explanation: 'Aerodynamic vents bleed wind energy through the structure, mitigating cross-wind vortex shedding.'
  },
  {
    id: 49,
    category: 'Construction Management',
    text: 'What device on modern construction tower cranes prevents the crane from exceeding its rated tipping load capacity?',
    options: [
      { id: 'A', text: 'Safe Load Indicator (SLI) / Load Moment Indicator' },
      { id: 'B', text: 'Tachometer' },
      { id: 'C', text: 'Fuel regulator valve' },
      { id: 'D', text: 'Counterweight cable reel' }
    ],
    correctId: 'A',
    explanation: 'Load moment limiters calculate boom radius and hook load to cut off hoisting if safety limits are exceeded.'
  },
  {
    id: 50,
    category: 'Sustainability',
    text: 'What is "Net-Zero Energy" building certification?',
    options: [
      { id: 'A', text: 'The total amount of energy used annually is roughly equal to renewable energy created on-site' },
      { id: 'B', text: 'A building that uses zero electricity and runs purely on gas' },
      { id: 'C', text: 'A building with zero windows to stop thermal exchange' },
      { id: 'D', text: 'A building that disconnects from all water lines' }
    ],
    correctId: 'A',
    explanation: 'Net-Zero buildings combine aggressive energy efficiency with on-site renewable generation (e.g. solar PV).'
  }
]

/**
 * Deterministically picks `count` unique questions for a given challenge.
 * All teams participating in the same `challengeId` receive the identical question set,
 * while different challenges receive different random question sets.
 */
export function getQuestionsForChallenge(challengeId?: string | null, count: number = 5): QuizQuestion[] {
  if (!challengeId || challengeId === 'civil-quiz-v1') {
    // Pick 5 random questions
    const shuffled = [...QUIZ_QUESTION_BANK].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  // Generate deterministic integer hash from challenge UUID
  let hash = 0
  for (let i = 0; i < challengeId.length; i++) {
    hash = (hash << 5) - hash + challengeId.charCodeAt(i)
    hash |= 0
  }

  // Seeded PRNG (Mulberry32)
  let seed = Math.abs(hash) || 987654321
  const seededRandom = () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // Fisher-Yates shuffle with seeded PRNG
  const pool = [...QUIZ_QUESTION_BANK]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, Math.min(count, pool.length))
}
