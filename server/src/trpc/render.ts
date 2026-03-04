import { z } from 'zod'
import { router, publicProcedure } from './init.js'
import { renderSvg } from '../picoweb.js'

export const renderRouter = router({
  svg: publicProcedure
    .input(z.object({ source: z.string() }))
    .mutation(async ({ input }) => {
      const { svg, error } = await renderSvg(input.source)
      return { svg, error }
    }),
})
