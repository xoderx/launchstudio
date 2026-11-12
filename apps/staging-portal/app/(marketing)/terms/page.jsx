import { LegalPage } from '../../marketing/components';
import { pageMetadata } from '../../marketing/content.mjs';
export const metadata={...pageMetadata('Preview terms — review draft','Legal review draft for the LaunchStudio Preview. Not approved as final production legal copy.','/terms'),robots:{index:false,follow:false}};
export default function Page(){return <LegalPage kind='terms'/>;}
