export function mountApp(root: Element): void {
  root.innerHTML = `
    <style>
      body { margin: 0; }
      #save { display: block; width: 120px; height: 40px; }
    </style>
    <button id="save" type="button">Save</button>
  `;
}
