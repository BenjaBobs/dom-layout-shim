import { Bench } from 'tinybench'
import { Window } from 'happy-dom'
import { createLayoutEngine } from '../../src'

const window = new Window()
const document = window.document

document.body.innerHTML = `
  <style>
    .box {
      position: absolute;
      width: 20px;
      height: 20px;
    }
  </style>
  ${Array.from({ length: 200 }, (_, index) => {
    const x = index % 20 * 20
    const y = Math.floor(index / 20) * 20
    return `<div id="box-${index}" class="box" style="left:${x}px; top:${y}px; z-index:${index}"></div>`
  }).join('')}
`

const engine = createLayoutEngine({
  viewport: { width: 800, height: 600 },
})

await engine.initialize()
const attachment = engine.attachTo(document)
attachment.recompute()

const bench = new Bench({ time: 100 })

bench
  .add('recompute 200 absolute boxes', () => {
    attachment.markDirty()
    attachment.recompute()
  })
  .add('getBoundingClientRect', () => {
    document.getElementById('box-150')?.getBoundingClientRect()
  })
  .add('elementFromPoint', () => {
    document.elementFromPoint(30, 30)
  })
  .add('elementsFromPoint', () => {
    ;(document as unknown as { elementsFromPoint(x: number, y: number): Element[] }).elementsFromPoint(30, 30)
  })

await bench.run()

for (const task of bench.tasks) {
  const result = task.result
  const hz = result && 'throughput' in result ? result.throughput.mean.toFixed(0) : '0'
  const mean = result && 'latency' in result ? result.latency.mean.toFixed(3) : '0.000'
  console.log(`${task.name}: ${hz} ops/sec, ${mean} ms mean`)
}

attachment.detach()
window.close()
