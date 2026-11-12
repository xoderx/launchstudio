import './marketing.css';
import { MarketingHeader } from '../marketing/client';
import { MarketingFooter } from '../marketing/components';
export default function MarketingLayout({children}){return <div className="marketing"><a className="m-skip" href="#marketing-main">Skip to content</a><MarketingHeader/><main id="marketing-main">{children}</main><MarketingFooter/></div>;}
