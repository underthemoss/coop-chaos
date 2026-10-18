import { treeHabitat } from "../content/tree-habitats";
import { settlers, trees, type TreeId } from "../content/settlement";
import { siteStatus, shelteredCapacity, treeBuildOptions, type Command, type Settlement } from "../simulation/settlement";

const names = {
  treehouse: "Treehouse & ladder",
  "sleeping-deck": "Extra sleeping deck",
  "hauling-basket": "Hauling basket & landing",
  store: "Store nest",
};

/** Tree-local controls read canonical availability and send ordinary build commands. */
export function TreeInspector({state, treeId, disabled, onSelect, onCommand}: {
  state: Settlement;
  treeId: TreeId;
  disabled: boolean;
  onSelect: (id: TreeId) => void;
  onCommand: (command: Command) => void;
}) {
  const tree = trees.find(t => t.id === treeId)!;
  const sites = state.sites.filter(s => s.tree === treeId);
  const occupants = state.birds.filter(b => (b.perch ?? b.flight)?.tree === treeId);
  const technique = state.basketTechnique;
  const places = treeHabitat(treeId).places;
  const placeFor = {treehouse:places.home,"hauling-basket":places.hauling,"sleeping-deck":places.deck,store:"Ground store"};
  const buildOrder = ["treehouse", "hauling-basket", "sleeping-deck"];
  const options = treeBuildOptions(state, treeId)
    .filter(option => !sites.some(site => site.kind === option.kind))
    .sort((a, b) => buildOrder.indexOf(a.kind) - buildOrder.indexOf(b.kind));
  return <section className="tree-inspector" aria-label={`${tree.name} building places`}>
    <nav className="tree-tabs" aria-label="Named trees">
      {trees.map(t => <button key={t.id} aria-pressed={t.id === treeId} onClick={() => onSelect(t.id)}>{t.name}</button>)}
    </nav>
    <span className="eyebrow">A PLACE TO CALL HOME</span>
    <h2>{tree.name}</h2>
    <p>{tree.description}</p>
    <div className="berth-summary"><strong>{places.natural} · 2 branches</strong><span>{shelteredCapacity(state, treeId)} sheltered berths</span></div>
    <p className="quiet">{occupants.length ? occupants.map(b => `${settlers.find(s => s.id === b.id)!.name}${b.flight ? b.flight.direction === "down" ? " leaving" : " arriving" : b.perch?.sheltered ? ` at ${b.perch.slot < 2 ? places.home : places.deck}` : ` at ${places.natural}`}`).join(" · ") : "No birds sleeping here now. Natural branches work before building."}</p>
    {sites.map(site => <article className="site-card" key={site.id}>
      <h3>{names[site.kind]} <span>{site.complete ? "Ready" : "In progress"}</span></h3>
      <p className="quiet">{placeFor[site.kind]}</p>
      <p className="work-status">{siteStatus(state, site)}</p>
      {site.contributors.length > 0 && <p className="quiet">Made by {site.contributors.map(id => settlers.find(s => s.id === id)!.name).join(", ")}</p>}
      {!site.complete && <button disabled={disabled} onClick={() => onCommand({type:"cancel", id:site.id})}>Cancel {names[site.kind].toLowerCase()}</button>}
    </article>)}
    {options.length > 0 && <h3>Build here</h3>}
    <div className="tree-build-options">
      {options.map(option => <article key={option.kind}>
        <button disabled={disabled || !option.available} onClick={() => onCommand({type:"build",kind:option.kind,at:{x:tree.x,z:tree.z}})}>
          <strong>{option.kind === "hauling-basket" && !technique ? "Experiment with a hauling basket" : option.kind === "hauling-basket" ? "Build hauling basket" : option.kind === "treehouse" ? "Build treehouse" : "Build extra sleeping deck"}</strong>
          <span>{option.cost} local reeds</span>
        </button>
        <p className="quiet">{option.reason || (option.kind === "treehouse" ? "Two sheltered berths and ladder access." : option.kind === "sleeping-deck" ? "Two more sheltered berths, supplied through this tree’s basket." : technique ? "Lift later deck deliveries to this landing." : "Weave the rig, then raise its last real bundle to learn the technique.")}</p>
      </article>)}
    </div>
    {technique && <p className="technique-memory">{settlers.find(s => s.id === technique.inventor)!.name} demonstrated the first lift at {trees.find(t => t.id === technique.tree)!.name}. The flock can build hauling baskets at other homes.</p>}
  </section>;
}
