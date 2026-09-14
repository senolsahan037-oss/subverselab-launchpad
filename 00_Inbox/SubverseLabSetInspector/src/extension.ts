import { initialize, type ActivationContext } from "@ableton-extensions/sdk";

function inspectObject(name: string, obj: any, depth: number = 0) {
  if (depth > 1) return; // Limit depth to avoid massive output
  if (obj === null || obj === undefined) {
    console.log(`${name}: ${String(obj)}`);
    return;
  }
  
  const properties: string[] = [];
  const methods: string[] = [];
  
  try {
    for (const key in obj) {
      try {
        const val = obj[key];
        if (typeof val === 'function') {
          methods.push(key);
        } else {
          properties.push(key);
        }
      } catch (e) {
        properties.push(`${key} (unreadable)`);
      }
    }
  } catch (e) {
    console.log(`Could not inspect ${name}`);
    return;
  }
  
  console.log(`\n=== OBJECT: ${name} ===`);
  console.log(`Type: ${typeof obj}`);
  console.log(`Properties: ${properties.join(', ') || 'none'}`);
  console.log(`Methods: ${methods.join(', ') || 'none'}`);
  
  // Inspect children if at depth 0
  if (depth === 0) {
      properties.forEach(p => {
          if (!p.includes('unreadable')) {
              try {
                  const val = obj[p];
                  if (typeof val === 'object' && val !== null) {
                      inspectObject(`${name}.${p}`, val, depth + 1);
                  }
              } catch (e) {}
          }
      });
  }
}

export function activate(context: ActivationContext) {
  const api = initialize(context, "1.0.0");

  api.commands.registerCommand("subverseLabInspectSet", () => {
    console.log("\n--- SubverseLab Set Inspector ---");
    console.log("Generating Capability Report...");
    
    inspectObject("api", api);
    
    // Explicitly check for common top-level objects if they aren't enumerated
    if (api.liveSet && !Object.keys(api).includes('liveSet')) {
        inspectObject("api.liveSet", api.liveSet);
    }
    
    console.log("\n--- End Capability Report ---");
  });

  // Register context menu for multiple possible targets to ensure it's accessible
  api.ui.registerContextMenuAction(
    "ClipSlot",
    "SubverseLab -> Inspect Set",
    "subverseLabInspectSet",
  );
  api.ui.registerContextMenuAction(
    "Track",
    "SubverseLab -> Inspect Set",
    "subverseLabInspectSet",
  );
  api.ui.registerContextMenuAction(
    "LiveSet",
    "SubverseLab -> Inspect Set",
    "subverseLabInspectSet",
  );
}
