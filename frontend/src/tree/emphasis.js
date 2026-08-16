/** Members the paper chart weights more heavily than the rest.
 *
 *  On the original chart the two roots of the archive and the central
 *  marriage are drawn in a darker, heavier frame so the eye finds them
 *  first. There is no column in the database for this — it is an editorial
 *  decision about the drawing, not a fact about the person — so it lives
 *  here as configuration and is attached to each node as a data property
 *  before rendering. The render code reads the property, never the names.
 *
 *  To re-weight the chart, edit this list. Nothing else needs to change.
 */
export const EMPHASIZED_MEMBERS = [
  'Rukondo',
  'Maria K. Mbabazi',
  'Januario M Tibamanya',
];
