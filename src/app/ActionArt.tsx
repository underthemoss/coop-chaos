/** Original action illustrations are presentation only; recipes and requests own the rules. */
export function ActionArt({kind}:{kind:"gather"|"build"|"food"|"home"|"nursery"|"store"|"basket"|"deck"}) {
  const path=kind==="gather"?"reeds":kind==="build"||kind==="home"||kind==="deck"||kind==="basket"?"home":kind==="food"?"food":kind==="nursery"?"nest":null;
  return path?<img className="action-art" src={`/assets/ui/actions/${path}.png`} alt=""/>:null;
}
