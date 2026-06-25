import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const buf = await request.text()
  const sig = request.headers.get('stripe-signature')!

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id ?? session.client_reference_id
      if (!userId) return NextResponse.json({ error: 'No user ID' }, { status: 400 })

      await admin.from('profiles').update({
        subscription_tier: 'premium',
        stripe_customer_id: session.customer as string,
        subscription_id: session.subscription as string,
      }).eq('id', userId)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      const { data: profiles } = await admin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .limit(1)

      if (profiles && profiles.length > 0) {
        await admin.from('profiles').update({
          subscription_tier: 'free',
          stripe_customer_id: null,
          subscription_id: null,
        }).eq('id', profiles[0].id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
